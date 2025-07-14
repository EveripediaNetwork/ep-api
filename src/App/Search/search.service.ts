import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService as AxiosHttpService } from '@nestjs/axios'
import { DataSource } from 'typeorm'
import { GoogleGenAI, Type } from '@google/genai'
import endent from 'endent'
import Wiki from '../../Database/Entities/wiki.entity'

type WikiData = Pick<Wiki, 'id' | 'title' | 'summary'>
type WikiSearchResult = {
  wikis: WikiSuggestion[]
}

type WikiSuggestion = {
  id: string
  title: string
  score: number
}

enum ApiLevel {
  PROD = 'prod',
  DEV = 'dev',
}

type WikiContent = Pick<Wiki, 'id' | 'title' | 'content'>

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

  private readonly modelName = 'gemini-2.0-flash'

  private readonly isProduction: boolean

  private readonly SCORE_THRESHOLD = 8

  constructor(
    private configService: ConfigService,
    private readonly httpService: AxiosHttpService,
    private dataSource: DataSource,
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

  private async fetchAllWikis(): Promise<WikiData[]> {
    const wikiApiUrl = this.configService.get<string>('WIKI_API_URL')
    if (!wikiApiUrl) {
      throw new Error('WIKI_API_URL is not defined in configuration.')
    }

    const { data } = await this.httpService.axiosRef.get(`${wikiApiUrl}/wiki`)

    return data as WikiData[]
  }

  private async getWikiSuggestions(wikis: WikiData[], query: string) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const wikiEntries = wikis
      .map(
        (wiki) =>
          `ID: ${wiki.id}\nTITLE: ${wiki.title}\nSUMMARY: ${wiki.summary}\n---`,
      )
      .join('\n\n')

    const wikiContent = endent`WIKI KNOWLEDGE BASE (${wikis.length} entries)
              ===========================================

              ${wikiEntries}
`

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: endent`Based on the following wiki knowledge base, suggest the most relevant wikis that would help answer this query: "${query}"

      ${wikiContent}

      For each wiki, provide a relevance score from 1-10 where:
      - 10 = extremely relevant to the query (directly addresses the topic)
      - 8-9 = highly relevant (closely related to the query)
      - 6-7 = moderately relevant (somewhat related)
      - 5 = minimally relevant (tangentially related)
      - 1-4 = barely relevant (should be excluded)

      Only include wikis with a score of 5 or higher.

      Return up to 10 wikis sorted by score (highest first).`,
      config: {
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
    return suggestions.filter((wiki) => wiki.score >= this.SCORE_THRESHOLD)
  }

  private async getIQWikiContent(wikiId: string) {
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

      return {
        id: wikiId,
        title: wiki.title,
        content: wiki.content,
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
      contents: endent`You are a wiki expert. Based on the provided context, answer the following question directly and concisely: "${query}"

        CONTEXT:
        ${contextContent}

        Provide a comprehensive answer using all available information from the wikis to give a complete picture.`,
    })

    return response.text || 'No answer generated'
  }

  async searchWithoutCache(query: string) {
    try {
      const allWikis = await this.fetchAllWikis()
      const rawSuggestions = await this.getWikiSuggestions(allWikis, query)
      const filteredSuggestions = this.filterByScore(rawSuggestions)

      const wikiIds = filteredSuggestions.map((wiki) => wiki.id)
      const wikiContents = await this.fetchWikiContents(wikiIds)

      let answer =
        'No wiki content was successfully fetched to answer the question.'

      if (wikiContents.length > 0) {
        answer = await this.answerQuestion(query, wikiContents)
      }

      return {
        suggestions: filteredSuggestions,
        answer,
      }
    } catch (error) {
      this.logger.error('Error in searchWithoutCache:', error)
      throw error
    }
  }

  async search(query: string) {
    const result = await this.searchWithoutCache(query)
    return result
  }
}

export default SearchService
