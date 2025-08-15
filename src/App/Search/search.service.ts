import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import OpenAI from 'openai'
import endent from 'endent'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from '../Wiki/wiki.service'

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

const wikiSuggestionSchema = {
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
        },
        required: ['id', 'title', 'score', 'reasoning'],
      },
    },
  },
  required: ['wikis'],
} as const

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

@Injectable()
class SearchService {
  private readonly logger = new Logger(SearchService.name)

  private ai: OpenAI | null = null

  private static readonly modelName = 'gpt-4.1-mini'

  private static readonly SCORE_THRESHOLD = 6

  private static readonly SEMANTIC_THRESHOLD = 7.0

  private static readonly SEED = 420

  private static readonly TEMPERATURE = 0.1

  private static readonly PREVIOUS_CONTEXT_COUNT = 8

  private static readonly ANSWER_TEMPERATURE = 0.3

  private static readonly CHUNK_SIZE = 1000

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

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private readonly wikiService: WikiService,
  ) {
    this.isProduction =
      this.configService.get<string>('API_LEVEL') === ApiLevel.PROD

    if (this.isProduction) {
      this.ai = new OpenAI({
        apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
      })
    }
  }

  async repository() {
    return this.dataSource.manager.getRepository(Wiki)
  }

  private formatMetadataKey(key: string) {
    return SearchService.METADATA_KEY_MAP[key] || key
  }

  private async processShard(
    shard: WikiData[],
    shardIndex: number,
    totalShards: number,
    query: string,
    previousSuggestions: WikiSuggestion[] = [],
  ) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const kbBlock = shard
      .map((w) => `ID: ${w.id}\nTITLE: ${w.title}\nSUMMARY: ${w.summary ?? ''}`)
      .join('\n\n')

    let previousContext = ''
    if (previousSuggestions.length > 0) {
      previousContext = `\n\nPREVIOUS TOP SUGGESTIONS FROM OTHER SHARDS:\n${previousSuggestions
        .slice(0, SearchService.PREVIOUS_CONTEXT_COUNT)
        .map(
          (s) =>
            `- ${s.title} (Score: ${s.score}) - ${s.reasoning || 'No reasoning'}`,
        )
        .join(
          '\n',
        )}\n\nWhen scoring current shard wikis, consider if they're MORE relevant than these existing suggestions. Re-rank if needed.`
    }

    const res = await this.ai.chat.completions.create({
      model:
        this.configService.get<string>('AI_MODEL') ?? SearchService.modelName,
      messages: [
        {
          role: 'system',
          content: endent`
            You are an expert at analyzing wiki relevance. You MUST be extremely strict about relevance.

            STRICT RELEVANCE SCORING:
            - 9-10: Directly answers the exact query, primary source of information
            - 7-8: Highly relevant, contains key information that helps answer the query
            - 5-6: Somewhat relevant, mentions related concepts but not central to the query
            - 3-4: Tangentially related, might have keywords but doesn't help answer the query
            - 1-2: Not relevant (DO NOT INCLUDE)

            CRITICAL CONSTRAINT:
            - ONLY analyze and return wikis from the provided knowledge base shard below
            - DO NOT generate, invent, or suggest any wikis not explicitly listed in the shard
            - ONLY use the exact IDs and titles provided in the knowledge base

            CRITICAL RULES:
            - Just because a title/summary contains query keywords doesn't make it relevant
            - Focus on whether the wiki actually ANSWERS or HELPS with the specific query
            - Be conservative with scores - it's better to miss some results than include irrelevant ones
            - ALWAYS provide reasoning explaining WHY the wiki is relevant to this specific query
            - Compare against previous suggestions to maintain consistency
            - Only include wikis with score >= 5

            The response MUST be valid JSON conforming to the schema.
          `,
        },
        {
          role: 'assistant',
          content: `WIKI SHARD #${shardIndex + 1}/${totalShards} (${shard.length} entries):\n${kbBlock}${previousContext}`,
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nAnalyze each wiki in this shard and score them considering the context of previous suggestions. Be strict about relevance.`,
        },
      ],
      temperature: SearchService.TEMPERATURE,
      seed: SearchService.SEED,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'wiki_suggestions',
          schema: wikiSuggestionSchema,
        },
      },
    })

    const content = res.choices[0]?.message?.content ?? ''
    try {
      const parsed = JSON.parse(content) as WikiSearchResult
      const suggestions = parsed?.wikis || []

      return suggestions.filter((s) => s.score >= SearchService.SCORE_THRESHOLD)
    } catch (e) {
      this.logger.warn(
        `Shard ${shardIndex + 1} returned invalid JSON; skipping. Error: ${(e as Error).message}`,
      )
      return []
    }
  }

  private async getWikiSuggestionsMapOnly(wikis: WikiData[], query: string) {
    if (!this.ai || wikis.length === 0) return []

    const chunksArr = chunk(wikis, SearchService.CHUNK_SIZE)

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
        .slice(0, SearchService.FINAL_TOP_K * 2)
    }

    return cumulativeSuggestions
      .filter((c) => c.score >= SearchService.SEMANTIC_THRESHOLD)
      .slice(0, SearchService.FINAL_TOP_K)
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

  private async answerQuestion(query: string, wikiContents: WikiContent[]) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const contextContent = wikiContents
      .map(
        (wiki, index) =>
          `[${index + 1}] WIKI: ${wiki.title}\nCONTENT: ${wiki.content}`,
      )
      .join('\n\n---\n\n')

    const response = await this.ai.chat.completions.create({
      model:
        this.configService.get<string>('AI_MODEL') ?? SearchService.modelName,
      messages: [
        {
          role: 'system',
          content: endent`
            You are a wiki expert assistant. Answer the user's question using ONLY the provided wiki content.

            RULES:
            - Use only information from the provided wikis
            - If information is missing or unclear, explicitly say so
            - Cite sources using the format: (Source: [Wiki Title])
            - Be concise but comprehensive
            - If multiple wikis contain relevant info, synthesize them clearly
            - Do not make assumptions or add external knowledge
          `,
        },
        {
          role: 'assistant',
          content: `AVAILABLE WIKIS:\n${contextContent}`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: SearchService.ANSWER_TEMPERATURE,
      seed: SearchService.SEED,
    })

    return (
      response.choices[0]?.message?.content ||
      'No answer could be generated from the available wiki content.'
    )
  }

  async searchWithoutCache(query: string, withAnswer: boolean) {
    try {
      const allWikis = await this.wikiService.getWikiIdTitleAndSummary()

      const topSuggestions = await this.getWikiSuggestionsMapOnly(
        allWikis,
        query,
      )

      if (topSuggestions.length === 0) {
        return {
          suggestions: [],
          wikiContents: [],
          answer:
            'No relevant wikis found for your query. Try rephrasing or using different keywords.',
        }
      }

      const wikiIds = topSuggestions.map((w) => w.id)
      const wikiContents = await this.fetchWikiContents(wikiIds)

      const fetchedWikiIds = new Set(wikiContents.map((wiki) => wiki.id))
      const metadataMap = new Map(
        wikiContents.map((wiki) => [wiki.id, wiki.metadata]),
      )

      const suggestions = topSuggestions
        .filter((s) => fetchedWikiIds.has(s.id))
        .map((s) => ({
          ...s,
          metadata: metadataMap.get(s.id),
        }))

      let answer = 'No wiki content was available to answer the question.'
      if (withAnswer && wikiContents.length > 0) {
        answer = await this.answerQuestion(query, wikiContents)
      }

      return {
        suggestions,
        wikiContents,
        answer,
      }
    } catch (error) {
      this.logger.error('Error in searchWithoutCache:', error)
      throw error
    }
  }

  async search(query: string, withAnswer: boolean) {
    return this.searchWithoutCache(query, withAnswer)
  }
}

export default SearchService
