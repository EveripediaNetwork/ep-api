import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { GoogleGenAI, Type } from '@google/genai'
import endent from 'endent'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from '../Wiki/wiki.service'

type WikiMetadata = {
  id: string
  value: string
}

type WikiData = Pick<Wiki, 'id' | 'title' | 'summary'>

type WikiSearchResult = {
  wikis: WikiSuggestion[]
}

type WikiSuggestion = {
  id: string
  title: string
  score: number
  metadata?: { url: string; title: string }[]
}

enum ApiLevel {
  PROD = 'prod',
  DEV = 'dev',
}

type WikiContent = Pick<Wiki, 'id' | 'title' | 'content'> & {
  metadata?: { url: string; title: string }[]
}

const wikiSuggestionSchema = {
  type: Type.OBJECT,
  properties: {
    wikis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'The wiki ID' },
          title: { type: Type.STRING, description: 'The wiki title' },
          score: {
            type: Type.NUMBER,
            description:
              'Relevance score from 1-10 (10 = extremely relevant to the query, 1 = barely relevant)',
            minimum: 1,
            maximum: 10,
          },
        },
        required: ['id', 'title', 'score'],
      },
      description:
        'Array of wikis with relevance scores (max 10, sorted by score descending)',
    },
  },
  required: ['wikis'],
} as const

@Injectable()
class SearchService {
  private readonly logger = new Logger(SearchService.name)

  private ai: GoogleGenAI | null = null

  private readonly modelName = 'gemini-2.5-flash'

  private readonly isProduction: boolean

  private readonly SCORE_THRESHOLD = 6

  private static readonly ALLOWED_METADATA = new Set([
    'website',
    'twitter_profile',
    'github_profile',
    'coinmarketcap_url',
    'coingecko_profile',
  ])

  private static readonly METADATA_KEY_MAP: Record<string, string> = {
    website: 'Website',
    twitter_profile: 'Twitter Profile',
    github_profile: 'GitHub Profile',
    coinmarketcap_url: 'CoinMarketCap Link',
    coingecko_profile: 'Coingecko Link',
  }

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private readonly wikiService: WikiService,
  ) {
    this.isProduction =
      this.configService.get<string>('API_LEVEL') === ApiLevel.PROD

    if (this.isProduction) {
      this.ai = new GoogleGenAI({
        apiKey: this.configService.getOrThrow<string>(
          'GOOGLE_GENERATIVE_AI_API_KEY',
        ),
      })
    }
  }

  async repository() {
    return this.dataSource.manager.getRepository(Wiki)
  }

  private formatMetadataKey(key: string): string {
    return SearchService.METADATA_KEY_MAP[key] || key
  }

  private filterMetadata(
    metadata?: WikiMetadata[],
  ): Record<string, string> | undefined {
    if (!metadata || metadata.length === 0) {
      return undefined
    }

    const filtered: Record<string, string> = {}

    for (const meta of metadata) {
      if (SearchService.ALLOWED_METADATA.has(meta.id)) {
        filtered[meta.id] = meta.value
      }
    }

    return Object.keys(filtered).length > 0 ? filtered : undefined
  }

  private async getWikiSuggestions(wikis: WikiData[], query: string) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const wikiEntries = wikis
      .map(
        (wiki) =>
          `ID: ${wiki.id}\nTITLE: ${wiki.title}\nSUMMARY: ${wiki.summary}`,
      )
      .join('\n\n')

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: endent`You are an expert at analyzing wiki content relevance. Your task is to carefully evaluate which wikis would be most helpful for answering the query: "${query}"

      WIKI KNOWLEDGE BASE (${wikis.length} entries):
      ${wikiEntries}

    INSTRUCTIONS:
      1. First, analyze the query to understand what information is being sought
      2. For each wiki, think through:
        - Does the title directly relate to the query topic?
        - Does the summary contain information that would help answer the query?
        - How well does the wiki content match what the user is asking for?
      3. Be thoughtful in your scoring, but do not overlook surface matches:
        - If the query term appears in the title or summary, give it at least a score of 5
        - Include all entries that mention the query term, even if they are only tangentially related
        - Use deeper semantic reasoning to elevate the most directly helpful entries
      4. Return only the most relevant wikis, up to 10 in total, sorted by score (highest first)
      5. Be precise and honest — do not score highly unless the entry clearly helps address the query

      SCORING CRITERIA:
      - 7-10 = Directly answers the query or provides essential information
      - 6 = Highly relevant, contains key information needed
      - 5 = Mentions the query term but only tangentially helpful
      - 1-4 = Not relevant to the query (exclude these)

      Think carefully about whether each wiki truly helps answer the specific query.`,
      config: {
        temperature: 0,
        seed: 420,
        responseMimeType: 'application/json',
        responseSchema: wikiSuggestionSchema,
      },
    })

    if (!response.text) {
      throw new Error('Gemini returned no response text')
    }

    try {
      const result = JSON.parse(response.text) as WikiSearchResult
      return result.wikis || []
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      throw new Error(`Invalid JSON from Gemini response: ${errorMessage}`)
    }
  }

  private filterByScore(suggestions: WikiSuggestion[]): WikiSuggestion[] {
    return suggestions.filter((wiki) => wiki.score > this.SCORE_THRESHOLD)
  }

  private async getIQWikiContent(wikiId: string): Promise<WikiContent | null> {
    try {
      const wiki = await (await this.repository())
        .createQueryBuilder('wiki')
        .where('wiki.languageId = :lang', { lang: 'en' })
        .andWhere('wiki.id = :id', { id: wikiId })
        .andWhere('wiki.hidden = false')
        .getOne()

      if (!wiki?.content) {
        return null
      }

      const filtered = this.filterMetadata(wiki.metadata)

      const metadata: { url: string; title: string }[] | undefined =
        filtered &&
        Object.entries(filtered).map(([key, value]) => ({
          url: value,
          title: `${wiki.title}${wiki.title.endsWith('s') ? "'" : "'s"} ${this.formatMetadataKey(key)}`,
        }))

      return {
        id: wiki.id,
        title: wiki.title,
        content: wiki.content,
        metadata,
      }
    } catch (error) {
      this.logger.error(`Error fetching wiki ${wikiId}:`, error)
      return null
    }
  }

  private async fetchWikiContents(wikiIds: string[]) {
    if (!wikiIds || wikiIds.length === 0) {
      return []
    }

    const promises = wikiIds.map((wikiId) => this.getIQWikiContent(wikiId))
    const results = await Promise.allSettled(promises)

    return results
      .filter(
        (result): result is PromiseFulfilledResult<WikiContent> =>
          result.status === 'fulfilled' && result.value !== null,
      )
      .map((result) => result.value)
  }

  private async answerQuestion(query: string, wikiContents: WikiContent[]) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const contextContent = wikiContents
      .map((wiki) => `WIKI: ${wiki.title}\nCONTENT: ${wiki.content}\n---`)
      .join('\n\n')

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: endent`You are a wiki expert tasked with providing accurate, comprehensive answers based on the provided context.

        QUERY: "${query}"

        CONTEXT:
        ${contextContent}

        INSTRUCTIONS:
        1. Carefully analyze the query to understand exactly what information is being requested
        2. Review all the provided wiki content to identify relevant information
        3. Think through how well the available content matches what the user is asking for
        4. If the content directly answers the query, provide a comprehensive response
        5. If the content is related but doesn't fully answer the query, clearly state what information is available and what might be missing
        6. Be honest about the limitations of the available information
        7. Structure your answer clearly and cite which wikis provide specific information when relevant

        Provide a thoughtful, well-reasoned answer that makes the best use of the available information while being transparent about its completeness.`,
      config: {
        temperature: 0,
        seed: 420,
      },
    })

    return response.text || 'No answer generated'
  }

  async searchWithoutCache(query: string, withAnswer: boolean) {
    try {
      const allWikis = await this.wikiService.getWikiIdTitleAndSummary()
      const rawSuggestions = await this.getWikiSuggestions(allWikis, query)
      const filteredSuggestions = this.filterByScore(rawSuggestions)
      const wikiIds = filteredSuggestions.map((wiki) => wiki.id)
      const wikiContents = await this.fetchWikiContents(wikiIds)

      const metadataMap = new Map(
        wikiContents.map((wiki) => [wiki.id, wiki.metadata]),
      )

      const enrichedSuggestions = filteredSuggestions.map((suggestion) => ({
        ...suggestion,
        metadata: metadataMap.get(suggestion.id),
      }))

      let answer =
        'No wiki content was successfully fetched to answer the question.'

      if (wikiContents.length > 0 && withAnswer) {
        answer = await this.answerQuestion(query, wikiContents)
      }

      return {
        suggestions: enrichedSuggestions,
        wikiContents,
        answer,
      }
    } catch (error) {
      this.logger.error('Error in searchWithoutCache:', error)
      throw error
    }
  }

  async search(query: string, withAnswer: boolean) {
    const result = await this.searchWithoutCache(query, withAnswer)
    return result
  }
}

export default SearchService
