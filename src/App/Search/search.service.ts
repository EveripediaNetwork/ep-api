import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { generateText, generateObject, jsonSchema } from 'ai'
import { google } from '@ai-sdk/google'
import endent from 'endent'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from '../Wiki/wiki.service'
import crawlIQLearnEnglish from '../utils/crawl-iq-learn'

type WikiData = Pick<Wiki, 'id' | 'title' | 'summary'>

type WikiSearchResult = {
  wikis: WikiSuggestion[]
}

type WikiSuggestion = {
  id: string
  title: string
  score: number
  reasoning?: string
  metadata?: { url: string; title: string }[]
}

enum ApiLevel {
  PROD = 'prod',
  DEV = 'dev',
}

type WikiContent = Pick<Wiki, 'id' | 'title' | 'content'> & {
  metadata?: { url: string; title: string }[]
}

const wikiSuggestionSchema = jsonSchema<{
  wikis: {
    id: string
    title: string
    score: number
    reasoning: string
    metadata?: { url: string; title: string }[]
  }[]
}>({
  type: 'object',
  properties: {
    wikis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The wiki ID' },
          title: { type: 'string', description: 'The wiki title' },
          score: {
            type: 'number',
            description: 'Relevance score from 1-10',
            minimum: 1,
            maximum: 10,
          },
          reasoning: {
            type: 'string',
            description:
              'Brief explanation of why this wiki is relevant to the query',
          },
          metadata: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
              },
              required: ['url', 'title'],
            },
          },
        },
        required: ['id', 'title', 'score', 'reasoning'],
        additionalProperties: false,
      },
    },
  },
  required: ['wikis'],
  additionalProperties: false,
})

@Injectable()
class SearchService {
  private readonly logger = new Logger(SearchService.name)

  private static readonly modelName = 'gemini-2.0-flash'

  private static readonly SCORE_THRESHOLD = 6

  private static readonly SEMANTIC_THRESHOLD = 7.0

  private static readonly ANSWER_TEMPERATURE = 0.3

  private static readonly FINAL_TOP_K = 5

  private readonly isProduction: boolean

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

  private static readonly LEARN_DOCS_CACHE_KEY = 'learn_docs'

  private static readonly LEARN_DOCS_TTL = 24 * 60 * 60 * 1000 * 30 // 30 days

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private readonly wikiService: WikiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.isProduction =
      this.configService.get<string>('API_LEVEL') === ApiLevel.PROD
  }

  async repository() {
    return this.dataSource.manager.getRepository(Wiki)
  }

  private formatMetadataKey(key: string) {
    return SearchService.METADATA_KEY_MAP[key] || key
  }

  private async getWikiSuggestions(wikis: WikiData[], query: string) {
    if (!this.isProduction) {
      throw new Error('AI service not available - production mode required')
    }

    const kbBlock = wikis
      .map((w) => `ID: ${w.id}\nTITLE: ${w.title}\nSUMMARY: ${w.summary ?? ''}`)
      .join('\n\n')

    const prompt = endent`
      You are an expert at analyzing wiki relevance. You MUST be extremely strict about relevance.

      STRICT RELEVANCE SCORING:
      - 9-10: Directly answers the exact query, primary source of information
      - 7-8: Highly relevant, contains key information that helps answer the query
      - 5-6: Somewhat relevant, mentions related concepts but not central to the query
      - 3-4: Tangentially related, might have keywords but doesn't help answer the query
      - 1-2: Not relevant (DO NOT INCLUDE)

      CRITICAL CONSTRAINT:
      - ONLY analyze and return wikis from the provided knowledge base below
      - DO NOT generate, invent, or suggest any wikis not explicitly listed
      - ONLY use the exact IDs and titles provided in the knowledge base

      CRITICAL RULES:
      - Just because a title/summary contains query keywords doesn't make it relevant
      - Focus on whether the wiki actually ANSWERS or HELPS with the specific query
      - Be conservative with scores - it's better to miss some results than include irrelevant ones
      - ALWAYS provide reasoning explaining WHY the wiki is relevant to this specific query
      - Only include wikis with score >= 5
      - Return maximum ${SearchService.FINAL_TOP_K} most relevant wikis

      KNOWLEDGE BASE:
      ${kbBlock}

      Query: "${query}"

      Analyze each wiki and score them based on relevance to this specific query. Be strict about relevance.
    `

    try {
      const { object } = await generateObject({
        model: google(SearchService.modelName),
        schema: wikiSuggestionSchema,
        prompt,
        temperature: 0.1,
      })

      const suggestions = (object as WikiSearchResult)?.wikis || []
      return suggestions.filter((s) => s.score > SearchService.SCORE_THRESHOLD)
    } catch (e) {
      this.logger.warn(
        `Gemini returned invalid response; skipping. Error: ${(e as Error).message}`,
      )
      return []
    }
  }

  private async fetchWikiContents(wikiIds: string[]) {
    if (!wikiIds || wikiIds.length === 0) return []

    const repo = await this.repository()
    const rows = await repo
      .createQueryBuilder('wiki')
      .select(['wiki.id', 'wiki.title', 'wiki.content', 'wiki.metadata'])
      .where('wiki.languageId = :lang', { lang: 'en' })
      .andWhere('wiki.hidden = false')
      .andWhere('wiki.id IN (:...ids)', { ids: wikiIds })
      .getMany()

    return rows
      .map((wiki) => {
        if (!wiki?.content) return null

        const rawMetadata = wiki.metadata || []
        const validMetadata: { url: string; title: string }[] = []

        for (const meta of rawMetadata as { id: string; value: string }[]) {
          if (
            SearchService.ALLOWED_METADATA.has(meta.id) &&
            meta.value &&
            meta.value.trim() &&
            (meta.value.startsWith('http') || meta.value.startsWith('www'))
          ) {
            validMetadata.push({
              url: meta.value,
              title: `${wiki.title}${wiki.title.endsWith('s') ? "'" : "'s"} ${this.formatMetadataKey(meta.id)}`,
            })
          }
        }

        return {
          id: wiki.id,
          title: wiki.title,
          content: wiki.content,
          metadata: validMetadata.length > 0 ? validMetadata : undefined,
        }
      })
      .filter((x) => x !== null)
  }

  private async answerQuestion(
    query: string,
    wikiContents: WikiContent[],
    learnDocsContent: string,
  ) {
    if (!this.isProduction) {
      throw new Error('AI service not available - production mode required')
    }

    const contextContent = wikiContents
      .map(
        (wiki, index) =>
          `[${index + 1}] WIKI: ${wiki.title}\nCONTENT: ${wiki.content}`,
      )
      .join('\n\n---\n\n')

    const prompt = endent`
      You are a knowledgeable assistant. Answer the user's question using the provided sources:
      1) Wiki articles ("AVAILABLE WIKIS") — must be cited
      2) IQ Learn documents ("ADDITIONAL CONTEXT — IQ Learn") — use as supporting context, but do NOT cite them

      RULES:
      - Cite ONLY wiki sources using the format: (Source: [Wiki Title])
      - Use Learn documents silently to improve completeness, but never reference or cite them directly
      - If information is missing or unclear from both sources, explicitly say so
      - If multiple wikis contain relevant info, synthesize them clearly with citations
      - Be concise but comprehensive
      - Do not add external knowledge beyond these provided sources

      AVAILABLE WIKIS:
      ${contextContent}

      ${learnDocsContent}

      Query: "${query}"
    `

    try {
      const { text } = await generateText({
        model: google(SearchService.modelName),
        prompt,
        temperature: SearchService.ANSWER_TEMPERATURE,
      })

      return (
        text ||
        'No answer could be generated from the available wiki or Learn content.'
      )
    } catch (e) {
      this.logger.error('Error generating answer:', e)
      return 'No answer could be generated from the available wiki or Learn content.'
    }
  }

  async searchWithoutCache(query: string, withAnswer: boolean) {
    try {
      const allWikis = await this.wikiService.getWikiIdTitleAndSummary()

      const topSuggestions = await this.getWikiSuggestions(allWikis, query)

      const learnDocs = await this.fetchLearnDocs()
      const learnDocsContent = this.formatLearnDocsForAI(learnDocs)

      if (topSuggestions.length === 0 && !learnDocsContent.trim()) {
        return {
          suggestions: [],
          wikiContents: [],
          learnDocs,
          answer:
            'No relevant wikis found for your query. Try rephrasing or using different keywords.',
        }
      }

      let wikiContents: WikiContent[] = []
      let suggestions: WikiSuggestion[] = []

      if (topSuggestions.length > 0) {
        const wikiIds = topSuggestions.map((w) => w.id)
        wikiContents = await this.fetchWikiContents(wikiIds)

        const fetchedWikiIds = new Set(wikiContents.map((wiki) => wiki.id))
        const metadataMap = new Map(
          wikiContents.map((wiki) => [wiki.id, wiki.metadata]),
        )

        suggestions = topSuggestions
          .filter((s) => fetchedWikiIds.has(s.id))
          .map((s) => ({
            ...s,
            metadata: metadataMap.get(s.id),
          }))
      }

      let answer = 'No content was available to answer the question.'
      if (withAnswer) {
        if (wikiContents.length > 0 || learnDocsContent.trim()) {
          answer = await this.answerQuestion(
            query,
            wikiContents,
            learnDocsContent,
          )
        }
      }

      return {
        suggestions,
        wikiContents,
        learnDocs,
        answer,
      }
    } catch (error) {
      this.logger.error('Error in searchWithoutCache:', error)
      throw error
    }
  }

  /**
   * Fetch learn docs with caching
   */
  private async fetchLearnDocs() {
    try {
      const cachedLearnDocs = await this.cacheManager.get(
        SearchService.LEARN_DOCS_CACHE_KEY,
      )

      if (cachedLearnDocs) {
        this.logger.debug('Using cached learn docs')
        return cachedLearnDocs as Awaited<
          ReturnType<typeof crawlIQLearnEnglish>
        >
      }

      this.logger.debug('Fetching fresh learn docs')
      const learnDocs = await crawlIQLearnEnglish(this.logger)

      await this.cacheManager.set(
        SearchService.LEARN_DOCS_CACHE_KEY,
        learnDocs,
        SearchService.LEARN_DOCS_TTL,
      )

      this.logger.debug(`Cached ${learnDocs.length} learn docs`)
      return learnDocs
    } catch (error) {
      this.logger.error('Failed to fetch learn docs:', error)
      return []
    }
  }

  async clearLearnDocsCache() {
    try {
      await this.cacheManager.del(SearchService.LEARN_DOCS_CACHE_KEY)
      this.logger.log('Learn docs cache cleared successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to clear learn docs cache:', error)
      return false
    }
  }

  async refreshLearnDocsCache() {
    try {
      this.logger.log('Refreshing learn docs cache...')
      const learnDocs = await crawlIQLearnEnglish(this.logger)
      await this.cacheManager.set(
        SearchService.LEARN_DOCS_CACHE_KEY,
        learnDocs,
        SearchService.LEARN_DOCS_TTL,
      )
      this.logger.log(
        `Learn docs cache refreshed successfully with ${learnDocs.length} docs.`,
      )
      return true
    } catch (error) {
      this.logger.error('Failed to refresh learn docs cache:', error)

      return false
    }
  }

  private formatLearnDocsForAI(
    learnDocs: Awaited<ReturnType<typeof crawlIQLearnEnglish>>,
  ) {
    if (!learnDocs?.length) return ''

    const header = endent`
    ADDITIONAL CONTEXT — IQ Learn (learn.iq.wiki)
    These documents contain learning material about the IQ token and the wider IQ/BrainDAO ecosystem (e.g., hiIQ, bridges, exchanges, contracts).
    Use them as supplemental context`

    const body = learnDocs
      .map((d, i) => `[L${i + 1}] ${d.title}\n${d.content}\n`)
      .join('\n')

    return `\n\n${header}\n\n${body}\n`
  }

  async search(query: string, withAnswer: boolean) {
    return this.searchWithoutCache(query, withAnswer)
  }
}

export default SearchService
