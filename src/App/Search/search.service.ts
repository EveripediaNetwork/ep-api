import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import OpenAI from 'openai'
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
            description:
              'Relevance score from 1-10 (10 = extremely relevant to the query, 1 = barely relevant)',
            minimum: 1,
            maximum: 10,
          },
        },
        required: ['id', 'title', 'score'],
      },
      description:
        'Array of wikis with relevance scores (max 5, sorted by score descending)',
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

  private static readonly SEED = 420

  private static readonly TEMPERATURE = 0

  private static readonly CHUNK_SIZE = 1000

  private static readonly SHARD_TOP_K = 5

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

  private formatMetadataKey(key: string): string {
    return SearchService.METADATA_KEY_MAP[key] || key
  }

  private filterMetadata(
    metadata?: WikiMetadata[],
  ): Record<string, string> | undefined {
    if (!metadata || metadata.length === 0) return undefined

    const filtered: Record<string, string> = {}
    for (const meta of metadata) {
      if (SearchService.ALLOWED_METADATA.has(meta.id) && meta.value) {
        filtered[meta.id] = meta.value
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined
  }

  private async processShard(
    shard: WikiData[],
    shardIndex: number,
    totalShards: number,
    query: string,
  ): Promise<WikiSuggestion[]> {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const kbBlock = shard
      .map((w) => `ID: ${w.id}\nTITLE: ${w.title}\nSUMMARY: ${w.summary ?? ''}`)
      .join('\n\n')

    const res = await this.ai.chat.completions.create({
      model:
        this.configService.get<string>('AI_MODEL') ?? SearchService.modelName,
      messages: [
        {
          role: 'system',
          content: endent`
            You are an expert at analyzing wiki relevance. Follow these rules strictly and return valid JSON only:

            RELEVANCE SCORING (internal policy):
            - 7–10: Directly answers the query or provides essential information
            - 6: Highly relevant, contains key information needed
            - 5: Mentions the query term but only tangentially helpful
            - 1–4: Not relevant (do not include)

            ADDITIONAL RULES:
            - If the query term appears in the title or summary, the minimum score is 5.
            - Return at most ${SearchService.SHARD_TOP_K} entries per shard, sorted by score descending.
            - The response MUST conform to the provided JSON schema.
          `,
        },
        {
          role: 'assistant',
          content: `WIKI KNOWLEDGE BASE SHARD #${shardIndex + 1}/${totalShards} (${shard.length} entries):\n${kbBlock}`,
        },
        {
          role: 'user',
          content: `Query: "${query}"`,
        },
      ],
      temperature: Number(
        this.configService.get('AI_TEMPERATURE') ?? SearchService.TEMPERATURE,
      ),
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
      return parsed?.wikis || []
    } catch (e) {
      this.logger.warn(
        `Shard ${shardIndex + 1} returned invalid JSON; skipping. Error: ${
          (e as Error).message
        }`,
      )
      return []
    }
  }

  private async getWikiSuggestionsMapOnly(
    wikis: WikiData[],
    query: string,
  ): Promise<WikiSuggestion[]> {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }
    if (wikis.length === 0) return []

    const chunksArr = chunk(wikis, SearchService.CHUNK_SIZE)

    const shardPromises = chunksArr.map((shard, index) =>
      this.processShard(shard, index, chunksArr.length, query),
    )

    const shardResults = await Promise.all(shardPromises)
    const allCandidates = shardResults.flat()

    return allCandidates
      .filter((c) => c.score > SearchService.SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
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
        const filtered = this.filterMetadata(wiki.metadata)
        const metadata: { url: string; title: string }[] | undefined =
          filtered &&
          Object.entries(filtered)
            .filter(([, value]) => value.trim())
            .map(([key, value]) => ({
              url: value,
              title: `${wiki.title}${wiki.title.endsWith('s') ? "'" : "'s"} ${this.formatMetadataKey(key)}`,
            }))

        return {
          id: wiki.id,
          title: wiki.title,
          content: wiki.content,
          metadata,
        }
      })
      .filter((x) => x !== null)
  }

  private async answerQuestion(query: string, wikiContents: WikiContent[]) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const contextContent = wikiContents
      .map((wiki) => `WIKI: ${wiki.title}\nCONTENT: ${wiki.content}\n---`)
      .join('\n\n')

    const response = await this.ai.chat.completions.create({
      model:
        this.configService.get<string>('AI_MODEL') ?? SearchService.modelName,
      messages: [
        {
          role: 'system',
          content:
            'You are a wiki expert. Answer strictly from the provided context. If information is missing, say so. Cite supporting wikis inline like (from: <wiki title>).',
        },
        {
          role: 'assistant',
          content: `CONTEXT:\n${contextContent}`,
        },
        {
          role: 'user',
          content: `Query: "${query}"`,
        },
      ],
      temperature: Number(
        this.configService.get('AI_TEMPERATURE') ?? SearchService.TEMPERATURE,
      ),
      seed: SearchService.SEED,
    })

    return response.choices[0]?.message?.content || 'No answer generated'
  }

  async searchWithoutCache(query: string, withAnswer: boolean) {
    try {
      const allWikis = await this.wikiService.getWikiIdTitleAndSummary()

      const topSuggestions = await this.getWikiSuggestionsMapOnly(
        allWikis,
        query,
      )

      const wikiIds = topSuggestions.map((w) => w.id)
      const wikiContents = await this.fetchWikiContents(wikiIds)

      const metadataMap = new Map(
        wikiContents.map((wiki) => [wiki.id, wiki.metadata]),
      )

      const suggestions = topSuggestions.map((s) => ({
        ...s,
        metadata: metadataMap.get(s.id),
      }))

      let answer =
        'No wiki content was successfully fetched to answer the question.'
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
