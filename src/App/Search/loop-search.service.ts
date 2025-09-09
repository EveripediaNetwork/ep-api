import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { generateObject, generateText } from 'ai'
import endent from 'endent'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from '../Wiki/wiki.service'
import SearchService, { wikiSuggestionSchema } from './search.service'

type WikiData = Pick<Wiki, 'id' | 'title' | 'summary'>

export type WikiSuggestion = {
  id: string
  title: string
  score: number
  reasoning?: string
  metadata?: { url: string; title: string }[]
}

type WikiContent = Pick<Wiki, 'id' | 'title' | 'content'> & {
  metadata?: { url: string; title: string }[]
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

@Injectable()
class LoopSearchService {
  private readonly logger = new Logger(LoopSearchService.name)

  private readonly openrouter: ReturnType<typeof createOpenRouter>

  private static readonly suggestionModelName = 'openai/gpt-4.1-mini'

  private static readonly finalAnswerModelName = 'openai/gpt-4.1-mini'

  private static readonly CHUNK_SIZE = 1000

  private static readonly FINAL_TOP_K = 5

  private static readonly SCORE_THRESHOLD = 7

  private static readonly TEMPERATURE = 0.1

  private static readonly ANSWER_TEMPERATURE = 0.2

  private static readonly PREVIOUS_CONTEXT_COUNT = 8

  private readonly isProduction: boolean

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private readonly wikiService: WikiService,
    private readonly searchService: SearchService,
  ) {
    this.isProduction = this.configService.get<string>('API_LEVEL') !== 'prod'

    this.openrouter = createOpenRouter({
      apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
    })
  }

  async repository() {
    return this.dataSource.manager.getRepository(Wiki)
  }

  private async processShard(
    shard: WikiData[],
    shardIndex: number,
    totalShards: number,
    query: string,
    previousSuggestions: WikiSuggestion[] = [],
  ) {
    if (!this.isProduction) {
      throw new Error('AI service not available - production mode required')
    }

    const kbBlock = shard
      .map((w) => `ID: ${w.id}\nTITLE: ${w.title}\nSUMMARY: ${w.summary ?? ''}`)
      .join('\n\n')

    const previousContext =
      previousSuggestions.length > 0
        ? endent`
        PREVIOUS TOP SUGGESTIONS FROM OTHER SHARDS:
        ${previousSuggestions
          .slice(0, LoopSearchService.PREVIOUS_CONTEXT_COUNT)
          .map(
            (s) =>
              `- ${s.title} (Score: ${s.score}) - ${s.reasoning || 'No reasoning'}`,
          )
          .join('\n')}

        When scoring current shard wikis, consider if they're MORE relevant than these existing suggestions.
        Re-rank if needed.
      `
        : ''

    try {
      const { object } = await generateObject({
        model: this.openrouter(LoopSearchService.suggestionModelName),
        schema: wikiSuggestionSchema,
        temperature: LoopSearchService.TEMPERATURE,
        messages: [
          {
            role: 'system',
            content: endent`
            You are WikiRank, an expert wiki relevance analyzer. Your job is to find the most relevant wikis for user queries with surgical precision.

            SCORING FRAMEWORK (Be ruthless with low scores):
            • 10: Perfect match - directly answers the exact query, primary authoritative source
            • 9: Nearly perfect - comprehensive coverage of the query topic with excellent detail
            • 8: Highly relevant - contains substantial information that directly helps answer the query
            • 7: Very relevant - covers key aspects of the query with good detail and clear value
            • 6: Moderately relevant - contains useful information related to the query
            • 5: Somewhat relevant - mentions related concepts but limited direct value
            • 1-4: Irrelevant or tangentially related (EXCLUDE ENTIRELY)

            STRICT ANALYSIS RULES:
            1. ONLY analyze wikis from the provided knowledge base - never invent content
            2. Keyword matching ≠ relevance - focus on actual informational value to the user
            3. Consider user intent from the query naturally - do NOT rely on predefined categories
            4. Prioritize depth over breadth - one comprehensive wiki beats three shallow ones
            5. If uncertain about relevance, err on the side of exclusion
            6. Maximum ${LoopSearchService.FINAL_TOP_K} results, minimum score ${LoopSearchService.SCORE_THRESHOLD}
            7. Score conservatively - it's better to return fewer, highly relevant results

            REASONING REQUIREMENTS:
            • Explain specifically WHY this wiki helps answer the user's query
            • Mention what key information, processes, or insights it provides
            • Note the connection between wiki content and the user's specific question
            • Be concrete about the value this wiki adds to answering the query
            • If there are any limitations in coverage, mention them briefly

            CRITICAL CONSTRAINT:
            - ONLY use wikis from the knowledge base provided
            - DO NOT generate, invent, or suggest any wikis not explicitly listed
            - ONLY use the exact IDs and titles from the provided knowledge base
          `,
          },
          {
            role: 'user',
            content: endent`
            Query: "${query}"

            WIKI SHARD #${shardIndex + 1}/${totalShards} (${shard.length} entries):
            ${kbBlock}

            ${previousContext}

            Analyze each wiki in this shard and score them considering the query and previous suggestions.
            Be strict about relevance and conservative with scoring.
          `,
          },
        ],
      })

      const suggestions = object?.wikis || []
      return suggestions.filter(
        (s) => s.score >= LoopSearchService.SCORE_THRESHOLD,
      )
    } catch (e) {
      console.log(JSON.stringify(e, null, 2))
      this.logger.warn(
        `OpenRouter suggestion model returned invalid response for shard ${shardIndex + 1} with query "${query}"; skipping. Error: ${(e as Error).message}`,
      )
      return []
    }
  }

  private async getWikiSuggestionsMapOnly(wikis: WikiData[], query: string) {
    if (wikis.length === 0) return []

    const chunksArr = chunk(wikis, LoopSearchService.CHUNK_SIZE)
    let cumulativeSuggestions: WikiSuggestion[] = []

    for (const [i, shard] of chunksArr.entries()) {
      const shardSuggestions = await this.processShard(
        shard,
        i,
        chunksArr.length,
        query,
        cumulativeSuggestions,
      )

      const existingIds = new Set(cumulativeSuggestions.map((s) => s.id))
      const newSuggestions = shardSuggestions.filter(
        (s) => !existingIds.has(s.id),
      )

      cumulativeSuggestions = [...cumulativeSuggestions, ...newSuggestions]
        .sort((a, b) => b.score - a.score)
        .slice(0, LoopSearchService.FINAL_TOP_K * 2) // Keep more during processing
    }

    return cumulativeSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, LoopSearchService.FINAL_TOP_K)
  }

  async getWikiSuggestions(query: string) {
    const allWikis = await this.wikiService.getWikiIdTitleAndSummary()
    return this.getWikiSuggestionsMapOnly(allWikis, query)
  }

  private async fetchWikiContents(wikiIds: string[]): Promise<WikiContent[]> {
    const searchServiceInstance = this.searchService as any
    return searchServiceInstance.fetchWikiContents(wikiIds)
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

    try {
      const { text } = await generateText({
        model: this.openrouter(LoopSearchService.finalAnswerModelName),
        temperature: LoopSearchService.ANSWER_TEMPERATURE,
        messages: [
          {
            role: 'system',
            content: endent`
        You are WikiBot, an expert knowledge synthesizer specializing in IQ token, BrainDAO ecosystem, and blockchain technology.

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
            role: 'user',
            content: endent`
        Query: ${query}

        AVAILABLE WIKI SOURCES:
        ${contextContent}

        LEARN DOCS (for background only):
        ${learnDocsContent}
      `,
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

  private async fetchLearnDocs() {
    const searchServiceInstance = this.searchService as any
    return searchServiceInstance.fetchLearnDocs()
  }

  private formatLearnDocsForAI(learnDocs: any[]) {
    const searchServiceInstance = this.searchService as any
    return searchServiceInstance.formatLearnDocsForAI(learnDocs)
  }

  private generateNoResultsMessage(query: string): string {
    const searchServiceInstance = this.searchService as any
    return searchServiceInstance.generateNoResultsMessage(query)
  }

  async generateAnswer(query: string, withLearnDocs = true) {
    try {
      const allWikis = await this.wikiService.getWikiIdTitleAndSummary()
      this.logger.debug(
        `LoopSearchService: Searching through ${allWikis.length} wikis for query: "${query}"`,
      )

      const topSuggestions = await this.getWikiSuggestionsMapOnly(
        allWikis,
        query,
      )

      const learnDocs = withLearnDocs ? await this.fetchLearnDocs() : []
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
          `LoopSearchService: Successfully fetched content for ${wikiContents.length} wikis`,
        )
      }

      let answer = 'No content was available to answer the question.'
      if (wikiContents.length > 0 || learnDocsContent.trim()) {
        answer = await this.answerQuestion(
          query,
          wikiContents,
          learnDocsContent,
        )
        this.logger.debug(
          `LoopSearchService: Generated answer of ${answer.length} characters`,
        )
      } else {
        answer = this.generateNoResultsMessage(query)
      }

      return {
        suggestions,
        wikiContents,
        learnDocs,
        answer,
      }
    } catch (error) {
      this.logger.error(
        `LoopSearchService: Error in generateAnswer for query "${query}":`,
        error,
      )
      throw error
    }
  }
}

export default LoopSearchService
