import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { generateText, generateObject, jsonSchema } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
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

type WikiContent = Pick<Wiki, 'id' | 'title' | 'content'> & {
  metadata?: { url: string; title: string }[]
}

export const wikiSuggestionSchema = jsonSchema<{
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
              'Specific explanation of why this wiki is relevant to the query and what key information it provides',
          },
          metadata: {
            type: 'array',
            description:
              'Optional list of related metadata entries with url and title',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Metadata link URL' },
                title: { type: 'string', description: 'Metadata link title' },
              },
              required: ['url', 'title'],
              additionalProperties: false,
            },
          },
        },
        required: ['id', 'title', 'score', 'reasoning', 'metadata'],
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

  private static readonly suggestionModelName = 'google/gemini-2.0-flash-001'

  private static readonly finalAnswerModelName = 'openai/gpt-4.1-mini'

  private static readonly SCORE_THRESHOLD = 7

  private static readonly ANSWER_TEMPERATURE = 0.2

  private static readonly FINAL_TOP_K = 5

  private readonly isProduction: boolean

  private readonly openrouter: ReturnType<typeof createOpenRouter>

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

  private static readonly LEARN_DOCS_TTL = 24 * 60 * 60 * 1000 * 30

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private readonly wikiService: WikiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.isProduction = this.configService.get<string>('API_LEVEL') === 'prod'

    this.openrouter = createOpenRouter({
      apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
    })
  }

  async repository() {
    return this.dataSource.manager.getRepository(Wiki)
  }

  private formatMetadataKey(key: string) {
    return SearchService.METADATA_KEY_MAP[key] || key
  }

  private formatWikisCompact(wikis: WikiData[]): string {
    return wikis.map((w) => `${w.id}|${w.title}|${w.summary || ''}`).join('\n')
  }

  private async getWikiSuggestions(wikis: WikiData[], query: string) {
    if (!this.isProduction) {
      throw new Error('AI service not available - production mode required')
    }

    const kbCompact = this.formatWikisCompact(wikis)

    try {
      const { object } = await generateObject({
        model: this.openrouter(SearchService.suggestionModelName),
        schema: wikiSuggestionSchema,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: endent`
              You are WikiRank, an expert wiki relevance analyzer. Your job is to find the most relevant wikis for user queries with surgical precision.

              WIKI DATA FORMAT: Each line contains: ID|TITLE|SUMMARY

              TITLE MATCHING PRIORITY (CRITICAL):
              • If query EXACTLY matches a wiki title, that wiki gets automatic 10/10 score
              • If query contains most words from a wiki title, boost score by +2
              • If wiki title contains exact query words, boost score by +1
              • Title matches are MORE IMPORTANT than content relevance

              SCORING FRAMEWORK (Be ruthless with low scores):
              • 10: Perfect match - title exactly matches query OR directly answers the exact query
              • 9: Nearly perfect - title closely matches OR comprehensive coverage with excellent detail
              • 8: Highly relevant - contains substantial information that directly helps answer the query
              • 7: Very relevant - covers key aspects of the query with good detail and clear value
              • 6: Moderately relevant - contains useful information related to the query
              • 5: Somewhat relevant - mentions related concepts but limited direct value
              • 1-4: Irrelevant or tangentially related (EXCLUDE ENTIRELY)

              STRICT ANALYSIS RULES:
              1. ONLY analyze wikis from the provided knowledge base - never invent content
              2. PRIORITIZE title matching over content matching - exact title matches get highest scores
              3. Keyword matching ≠ relevance - focus on actual informational value to the user
              4. Consider user intent from the query naturally - do NOT rely on predefined categories
              5. Prioritize depth over breadth - one comprehensive wiki beats three shallow ones
              6. If uncertain about relevance, err on the side of exclusion
              7. Maximum ${SearchService.FINAL_TOP_K} results, minimum score ${SearchService.SCORE_THRESHOLD}
              8. Score conservatively - it's better to return fewer, highly relevant results

              REASONING REQUIREMENTS:
              • First mention if title matches the query (and how closely)
              • Explain specifically WHY this wiki helps answer the user's query
              • Mention what key information, processes, or insights it provides
              • Note the connection between wiki content and the user's specific question
              • Be concrete about the value this wiki adds to answering the query
              • If there are any limitations in coverage, mention them briefly

              CRITICAL CONSTRAINT:
              - ONLY use wikis from the knowledge base provided below
              - DO NOT generate, invent, or suggest any wikis not explicitly listed
              - ONLY use the exact IDs and titles from the provided knowledge base
            `,
          },
          {
            role: 'assistant',
            content: `KNOWLEDGE BASE (Format: ID|TITLE|SUMMARY):\n${kbCompact}`,
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nAnalyze each wiki and score them based on relevance to this specific query. PRIORITIZE wikis whose titles match or closely match the query terms. Focus on which wikis would actually help the user achieve their goal. Be strict about relevance and conservative with scoring.`,
          },
        ],
      })

      const suggestions = (object as WikiSearchResult)?.wikis || []
      return suggestions.filter((s) => s.score >= SearchService.SCORE_THRESHOLD)
    } catch (e) {
      this.logger.warn(
        `OpenRouter suggestion model returned invalid response for query "${query}"; skipping. Error: ${(e as Error).message}`,
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

  private formatWikiContentsCompact(wikiContents: WikiContent[]): string {
    return wikiContents
      .map((wiki, index) => `[${index + 1}]|${wiki.title}|${wiki.content}`)
      .join('\n\n---\n\n')
  }

  private async answerQuestion(
    query: string,
    wikiContents: WikiContent[],
    learnDocsContent: string,
  ) {
    if (!this.isProduction) {
      throw new Error('AI service not available - production mode required')
    }

    const contextContent = this.formatWikiContentsCompact(wikiContents)

    try {
      const { text } = await generateText({
        model: this.openrouter(SearchService.finalAnswerModelName),
        temperature: SearchService.ANSWER_TEMPERATURE,
        messages: [
          {
            role: 'system',
            content: endent`
              You are WikiBot, an expert knowledge synthesizer specializing in IQ token, BrainDAO ecosystem, and blockchain technology.

              WIKI DATA FORMAT: Each wiki entry is formatted as [INDEX]|TITLE|CONTENT

              SOURCE HIERARCHY:
              1. WIKI ARTICLES (PRIMARY) - Must be cited: (Source: [Wiki Title])
              2. IQ LEARN DOCS (SUPPLEMENTARY) - Use silently for context, never cite

              RESPONSE APPROACH:
              • Lead with a direct answer to the user's specific question
              • Provide comprehensive coverage using all relevant information
              • Synthesize multiple sources naturally, showing connections
              • Include specific details, examples, and technical data when available
              • Acknowledge limitations transparently when information is incomplete

              CITATION RULES:
              • Cite every claim from wiki sources: (Source: [Exact Wiki Title])
              • When combining multiple wikis, cite each relevant source
              • Use Learn docs to enhance responses but never reference them directly
              • If sources conflict, acknowledge different perspectives

              FORBIDDEN:
              ✗ External knowledge beyond provided sources
              ✗ Speculation beyond available information
              ✗ Direct citation of Learn docs
              ✗ Unsupported claims or assumptions

              TONE: Professional, conversational, technically accurate but accessible
            `,
          },
          {
            role: 'assistant',
            content: `AVAILABLE WIKI SOURCES (Format: [INDEX]|TITLE|CONTENT):\n${contextContent}`,
          },
          {
            role: 'assistant',
            content: learnDocsContent,
          },
          {
            role: 'user',
            content: `Query: ${query}`,
          },
        ],
      })

      return (
        text ||
        'No answer could be generated from the available wiki or Learn content.'
      )
    } catch (e) {
      this.logger.error(`Error generating answer for query "${query}":`, e)
      return 'No answer could be generated from the available wiki or Learn content.'
    }
  }

  private generateNoResultsMessage(query: string): string {
    return endent`
      No highly relevant wikis were found for your query: "${query}"

      This could mean:
      • The topic isn't covered in our current wiki database
      • The query might need rephrasing for better matching
      • You might be looking for very specific information that requires broader search terms

      Try these suggestions:
      • Use broader terms (e.g., "IQ token" instead of "IQ token staking rewards calculation")
      • Try different keywords that describe the same concept
      • Break complex queries into simpler, more focused questions
      • Check for typos in technical terms or project names

      Our wiki database focuses on IQ token, BrainDAO ecosystem, and related blockchain technologies. Questions outside this scope may not yield results.
    `
  }

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
      ADDITIONAL CONTEXT — IQ Learn Documentation (learn.iq.wiki)

      The following documents contain supplementary learning material about the IQ token ecosystem,
      BrainDAO, hiIQ, bridges, exchanges, smart contracts, and related blockchain technologies.
      Use this information to enhance your responses with additional context and depth, but do NOT cite these sources directly.

      Integration Guidelines:
      • Use this content to fill gaps in wiki information
      • Provide additional technical details when relevant
      • Enhance explanations with practical examples from these docs
      • Support wiki claims with complementary information
      • Never reference "Learn docs" or "learn.iq.wiki" in your response
    `

    const body = learnDocs
      .map(
        (doc, i) =>
          `[L${i + 1}] TITLE: ${doc.title}\nCONTENT: ${doc.content}\n`,
      )
      .join('\n---\n\n')

    return `\n\n${header}\n\n${body}\n`
  }

  async searchWithoutCache(query: string, withAnswer: boolean) {
    try {
      const allWikis = await this.wikiService.getWikiIdTitleAndSummary()
      this.logger.debug(
        `Searching through ${allWikis.length} wikis for query: "${query}"`,
      )

      const topSuggestions = await this.getWikiSuggestions(allWikis, query)

      const learnDocs = await this.fetchLearnDocs()
      const learnDocsContent = this.formatLearnDocsForAI(learnDocs)

      if (topSuggestions.length === 0 && !learnDocsContent.trim()) {
        return {
          suggestions: [],
          wikiContents: [],
          learnDocs,
          answer: this.generateNoResultsMessage(query),
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

        this.logger.debug(
          `Successfully fetched content for ${wikiContents.length} wikis`,
        )
      }

      let answer = 'No content was available to answer the question.'
      if (withAnswer) {
        if (wikiContents.length > 0 || learnDocsContent.trim()) {
          answer = await this.answerQuestion(
            query,
            wikiContents,
            learnDocsContent,
          )
          this.logger.debug(`Generated answer of ${answer.length} characters`)
        } else {
          answer = this.generateNoResultsMessage(query)
        }
      }

      return {
        suggestions,
        wikiContents,
        learnDocs,
        answer,
      }
    } catch (error) {
      this.logger.error(
        `Error in searchWithoutCache for query "${query}":`,
        error,
      )
      throw error
    }
  }

  async search(query: string, withAnswer: boolean) {
    return this.searchWithoutCache(query, withAnswer)
  }
}

export default SearchService
