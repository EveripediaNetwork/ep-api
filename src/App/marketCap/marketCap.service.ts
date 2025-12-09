/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
import { DataSource } from 'typeorm'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import {
  BASE_URL_COINGECKO_API,
  MARKETCAP_SEARCH_CACHE_KEY,
  MarketCapInputs,
  MarketCapSearchInputs,
  MarketCapSearchType,
  NftRankListData,
  NO_WIKI_MARKETCAP_SEARCH_CACHE_KEY,
  RankPageIdInputs,
  RankType,
  STABLECOIN_CATEGORIES_CACHE_KEY,
  TokenRankListData,
} from './marketcap.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'
import Events from '../../Database/Entities/Event.entity'
import Pm2Service, { Pm2Events } from '../utils/pm2Service'
import { Globals } from '../../globalVars'
import GatewayService from '../utils/gatewayService'

const noContentWiki = {
  id: 'no-content',
  title: 'No content',
  ipfs: 'no-content',
  created: new Date(),
  media: [],
  events: [],
  images: [],
  tags: [{ id: 'no-content' }],
} as unknown as Partial<Wiki>

interface RankPageWiki {
  wiki: Wiki
  founders: (Wiki | null)[]
  blockchain: (Wiki | null)[]
}

interface MarketCapMapping {
  coingeckoId: string
  wikiId: string
}

interface WikiRawData {
  id: string
  title: string
  ipfs: string
  images: { id: string; type: string }[]
  metadata: { id: string; value: string }[]
  created: Date
  linkedWikis: { founders?: string[]; blockchains?: string[] }
  tag_ids: (string | null)[]
}

interface LinkedWikiData {
  id: string
  title: string
  ipfs: string
  images: { id: string; type: string }[]
}

interface EventData {
  wikiId: string
  type: string
  date: Date
  title?: string
  description?: string
  link?: string
  multiDateStart?: Date
  multiDateEnd?: Date
}

interface ProcessedWikiData extends Omit<WikiRawData, 'tag_ids'> {
  tags: { id: string }[]
  events?: EventData[]
}

@Injectable()
class MarketCapService {
  private readonly logger = new Logger(MarketCapService.name)

  private RANK_LIMIT: number

  private RANK_PAGE_LIMIT = 250

  private INCOMING_WIKI_ID: string | null = null

  private CACHED_WIKI: RankPageWiki | null = null

  constructor(
    private dataSource: DataSource,
    private pm2Service: Pm2Service,
    private gateway: GatewayService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.RANK_LIMIT = this.configService.get<number>('RANK_LIMIT', 2500)
  }

  private async findWikisBulk(
    ids: string[],
    category: string,
  ): Promise<Map<string, RankPageWiki>> {
    const resultsMap = new Map<string, RankPageWiki>()
    if (!ids.length) return resultsMap

    const cachedResults = await Promise.all(
      ids.map((id) => this.cacheManager.get<RankPageWiki>(id)),
    )
    const uncachedIds = ids.filter((id, i) => {
      if (cachedResults[i]) resultsMap.set(id, cachedResults[i]!)
      return !cachedResults[i]
    })
    if (!uncachedIds.length) return resultsMap

    const coinType = category === 'cryptocurrencies' ? 'coins' : 'nft'
    const profileUrls = uncachedIds.map(
      (id) => `https://www.coingecko.com/en/${coinType}/${id}`,
    )

    const [marketCapMappings, wikisRaw] = await Promise.all([
      this.dataSource.query(
        `SELECT "coingeckoId", "wikiId" FROM market_cap_ids WHERE "coingeckoId" = ANY($1::text[]) AND kind = $2`,
        [uncachedIds, category],
      ) as Promise<MarketCapMapping[]>,
      this.dataSource.query(
        `SELECT w.id, w.title, w.ipfs, w.images, w.metadata, w.created, w."linkedWikis",
                array_agg(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL) as tag_ids
         FROM wiki w
         LEFT JOIN wiki_tags_tag wt ON wt."wikiId" = w.id
         LEFT JOIN tag t ON t.id = wt."tagId"
         WHERE w.hidden = false AND (w.id = ANY($1::text[]) OR EXISTS (
           SELECT 1 FROM json_array_elements(w.metadata) AS meta
           WHERE meta->>'id' = 'coingecko_profile' AND meta->>'value' = ANY($2::text[])
         ))
         GROUP BY w.id`,
        [uncachedIds, profileUrls],
      ) as Promise<WikiRawData[]>,
    ])

    const cgToWikiMap = new Map<string, string>(
      marketCapMappings.map((m: MarketCapMapping) => [m.coingeckoId, m.wikiId]),
    )
    const wikiMap = new Map<string, ProcessedWikiData>(
      wikisRaw.map((w: WikiRawData) => [
        w.id,
        {
          ...w,
          tags:
            w.tag_ids
              ?.filter((id): id is string => id !== null)
              .map((id: string) => ({ id })) || [],
        },
      ]),
    )
    const urlToIdMap = new Map<string, string>(
      wikisRaw.flatMap((w: WikiRawData) => {
        const cg = w.metadata?.find(
          (m: { id: string; value: string }) => m.id === 'coingecko_profile',
        )
        return cg?.value ? [[cg.value, w.id]] : []
      }),
    )

    const getWiki = (id: string): ProcessedWikiData | undefined =>
      wikiMap.get(cgToWikiMap.get(id) || id) ||
      wikiMap.get(
        urlToIdMap.get(`https://www.coingecko.com/en/${coinType}/${id}`) || '',
      )

    const allLinkedIds = new Set<string>()
    const wikiIdsForEvents: string[] = []
    uncachedIds.forEach((id) => {
      const w = getWiki(id)
      if (w) {
        wikiIdsForEvents.push(w.id)
        w.linkedWikis?.founders?.forEach((f: string) => allLinkedIds.add(f))
        w.linkedWikis?.blockchains?.forEach((b: string) => allLinkedIds.add(b))
      }
    })

    const [linkedWikis, events] = await Promise.all([
      allLinkedIds.size
        ? (this.dataSource.query(
            `SELECT id, title, ipfs, images FROM wiki WHERE id = ANY($1::text[]) AND hidden = false`,
            [[...allLinkedIds]],
          ) as Promise<LinkedWikiData[]>)
        : Promise.resolve([]),
      wikiIdsForEvents.length
        ? (this.dataSource.query(
            `SELECT * FROM events WHERE "wikiId" = ANY($1::text[])`,
            [wikiIdsForEvents],
          ) as Promise<EventData[]>)
        : Promise.resolve([]),
    ])

    const linkedMap = new Map<string, LinkedWikiData>(
      linkedWikis.map((w: LinkedWikiData) => [w.id, w]),
    )
    const eventsMap = events.reduce(
      (acc: Map<string, EventData[]>, e: EventData) => {
        acc.set(e.wikiId, [...(acc.get(e.wikiId) || []), e])
        return acc
      },
      new Map<string, EventData[]>(),
    )

    for (const id of uncachedIds) {
      const wikiData = getWiki(id)
      const result: RankPageWiki = wikiData
        ? {
            wiki: {
              ...wikiData,
              events: eventsMap.get(wikiData.id) || [],
            } as unknown as Wiki,
            founders: (wikiData.linkedWikis?.founders || [])
              .map((f: string) => linkedMap.get(f))
              .filter(
                (wiki): wiki is LinkedWikiData => wiki !== undefined,
              ) as unknown as Wiki[],
            blockchain: (wikiData.linkedWikis?.blockchains || [])
              .map((b: string) => linkedMap.get(b))
              .filter(
                (wiki): wiki is LinkedWikiData => wiki !== undefined,
              ) as unknown as Wiki[],
          }
        : { wiki: null as any, founders: [], blockchain: [] }

      if (wikiData && this.INCOMING_WIKI_ID === wikiData.id)
        this.CACHED_WIKI = result
      resultsMap.set(id, result)
      this.cacheManager.set(id, result, 3600 * 1000)
    }

    return resultsMap
  }

  async getWikiData(
    coinsData: Record<any, any> | undefined,
    kind: RankType,
    delay = false,
  ): Promise<(RankPageWiki | null)[]> {
    if (!coinsData?.length) return []

    const batchSize = 100
    const allWikis: (RankPageWiki | null)[] = []

    for (let i = 0; i < coinsData.length; i += batchSize) {
      const batch = coinsData.slice(i, i + batchSize)
      const wikisMap = await this.findWikisBulk(
        batch.map((e: any) => e.id),
        kind.toLowerCase(),
      )

      allWikis.push(...batch.map((e: any) => wikisMap.get(e.id) || null))

      if (delay) {
        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    return allWikis
  }

  async *marketData(args: MarketCapInputs, reset = false) {
    const { kind } = args

    const data = this.cgMarketDataApiCall(args, reset)
    for await (const batch of data) {
      if (!batch?.length) {
        return []
      }
      const wikis = await this.getWikiData(batch, kind)

      const processedResults = await Promise.all(
        batch.map((element: Record<string, any>, index: number) => {
          const wiki = wikis && index < wikis.length ? wikis[index] : null
          return this.processMarketElement(element, wiki, kind)
        }),
      )

      yield processedResults
    }
  }

  private processMarketElement(
    element: any,
    rankpageWiki: any,
    kind: RankType,
  ) {
    const tokenData =
      kind === RankType.TOKEN
        ? {
            image: element.image || '',
            id: element.id,
            name: element.name || '',
            alias: element.symbol || '',
            current_price: element.current_price || 0,
            market_cap: element.market_cap || 0,
            market_cap_rank: element.market_cap_rank || 0,
            price_change_24h: element.price_change_percentage_24h || 0,
            market_cap_change_24h: element.market_cap_change_24h || 0,
          }
        : {
            alias: null,
            id: element.id,
            name: element.name || '',
            image: element.image?.small || '',
            native_currency: element.native_currency || '',
            native_currency_symbol: element.native_currency_symbol || '',
            floor_price_eth: element.floor_price?.native_currency || 0,
            floor_price_usd: element.floor_price?.usd || 0,
            market_cap_usd: element.market_cap?.usd || 0,
            h24_volume_usd: element.volume_24h?.usd || 0,
            h24_volume_native_currency:
              element.volume_24h?.native_currency || 0,
            floor_price_in_usd_24h_percentage_change:
              element.floor_price_in_usd_24h_percentage_change || 0,
          }

    const marketData = {
      [kind === RankType.TOKEN ? 'tokenMarketData' : 'nftMarketData']: {
        hasWiki: !!rankpageWiki?.wiki,
        ...tokenData,
      },
    }

    if (!rankpageWiki?.wiki) {
      return {
        ...noContentWiki,
        id: tokenData.name,
        title: tokenData.name,
        ...marketData,
      }
    }

    return {
      id: rankpageWiki.wiki.id,
      title: rankpageWiki.wiki.title,
      images: rankpageWiki.wiki.images,
      tags: rankpageWiki.wiki.__tags__?.map((t: any) => ({ id: t.id })),
      events: rankpageWiki.wiki.events?.map((e: any) => ({
        type: e.type,
        date: e.date,
        title: e.title,
      })),
      founderWikis: rankpageWiki.founders?.map((f: any) => ({
        id: f.id,
        title: f.title,
        images: f.images,
      })),
      blockchainWikis: rankpageWiki.blockchain?.map((f: any) => ({
        id: f.id,
        title: f.title,
        images: f.images,
      })),
      ...marketData,
    }
  }

  async *cgMarketDataApiCall(
    args: MarketCapInputs,
    reset = false,
  ): AsyncGenerator<Record<any, any>[], void, unknown> {
    try {
      const { kind, category, limit = this.RANK_PAGE_LIMIT, offset = 0 } = args
      for await (const batch of this.fetchMarketData(
        kind,
        category,
        limit,
        offset,
        reset,
      )) {
        if (batch.length > 0) {
          yield batch
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to fetch market data:',
        error instanceof Error ? error.message : error,
      )
    }
  }

  private async *fetchMarketData(
    kind: RankType,
    category?: string,
    limit = this.RANK_PAGE_LIMIT,
    offset = 0,
    reset = false,
  ): AsyncGenerator<Record<any, any>[], void, unknown> {
    const isBackgroundJob = limit === this.RANK_PAGE_LIMIT
    const perPage = isBackgroundJob ? this.RANK_PAGE_LIMIT : limit
    const totalToFetch = isBackgroundJob ? this.RANK_LIMIT : limit

    const startPage = Math.floor(offset / perPage) + 1
    const totalPages = isBackgroundJob
      ? Math.ceil(this.RANK_LIMIT / perPage)
      : startPage

    const categoryParam = category ? `category=${category}&` : ''

    let totalFetched = 0
    let lastUrl: string | undefined

    for (let page = startPage; page <= totalPages; page += 1) {
      const url = this.buildApiUrl(
        BASE_URL_COINGECKO_API,
        kind,
        categoryParam,
        perPage,
        page,
      )
      lastUrl = url

      const cachedData = await this.tryGetFromCache(url, reset)
      if (cachedData) {
        yield cachedData
        totalFetched += cachedData.length
        if (totalFetched >= totalToFetch) {
          break
        }
        continue
      }

      const freshData = await this.fetchAndCacheData(url)
      if (freshData) {
        yield freshData
        totalFetched += freshData.length
      }

      if (
        totalFetched >= totalToFetch ||
        (freshData && freshData.length === 0)
      ) {
        break
      }
    }

    if (lastUrl) {
      Globals.REFRESH_CACHE_KEY = lastUrl
    }
  }

  private async tryGetFromCache<T = Record<string, any>>(
    url: string,
    reset: boolean,
  ): Promise<T[] | null> {
    if (reset) {
      await this.cacheManager.del(url)
      return null
    }

    const cachedResult = await this.cacheManager.get<T[]>(url)
    return cachedResult ?? null
  }

  private buildApiUrl(
    baseUrl: string,
    kind: RankType,
    categoryParam: string,
    perPage: number,
    page: number,
  ): string {
    return kind === RankType.TOKEN
      ? `${baseUrl}coins/markets?vs_currency=usd&${categoryParam}order=market_cap_desc&per_page=${perPage}&page=${page}`
      : `${baseUrl}nfts/markets?order=h24_volume_usd_desc&per_page=${perPage}&page=${page}`
  }

  private async fetchAndCacheData(
    url: string,
  ): Promise<Record<any, any>[] | null> {
    try {
      const data = await this.gateway.fetchData<Record<string, any>>(
        url,
        60 * 60,
      )

      if (data) {
        await this.cacheManager.set(url, data, 180 * 1000)
        return data as Record<any, any>[]
      }
      return null
    } catch (error) {
      this.logger.error(
        `API request failed for ${url}:`,
        error instanceof Error ? error.message : error,
      )
      return null
    }
  }

  async collectAll<T>(generator: AsyncGenerator<T[]>): Promise<T[]> {
    const results: T[] = []
    for await (const batch of generator) {
      results.push(...batch)
    }
    return results
  }

  async ranks(
    args: MarketCapInputs,
  ): Promise<(TokenRankListData | NftRankListData)[]> {
    const matchedCategory = args.category
      ? await this.getCacheCateoryKey(args.category)
      : undefined
    let data
    if (!args.hasWiki) {
      const cachedData = await this.cacheManager.get<MarketCapSearchType>(
        NO_WIKI_MARKETCAP_SEARCH_CACHE_KEY,
      )
      if (args.kind === RankType.NFT) {
        data = cachedData?.nfts as unknown as NftRankListData[]
      } else if (
        args.kind === RankType.TOKEN &&
        args.category &&
        matchedCategory?.key &&
        cachedData
      ) {
        data = cachedData[
          matchedCategory?.key
        ] as unknown as TokenRankListData[]
      } else {
        data = cachedData?.tokens as unknown as TokenRankListData[]
      }

      if (data) {
        data = data.slice(args.offset, args.offset + args.limit)
      }
    } else {
      data = await this.collectAll(
        this.marketData({
          ...args,
          category:
            args.category === 'stablecoins'
              ? args.category
              : matchedCategory?.id || args.category,
        }),
      )
    }
    const result =
      args.kind === RankType.NFT
        ? (data as unknown as NftRankListData[])
        : (data as unknown as TokenRankListData[])

    return result || []
  }

  async updateMistachIds(args: RankPageIdInputs): Promise<boolean> {
    const { offset, limit, kind, coingeckoId, wikiId } = args
    this.INCOMING_WIKI_ID = wikiId
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)
    try {
      const existingRecord = await marketCapIdRepository.findOne({
        where: { coingeckoId },
      })

      if (existingRecord) {
        await this.cacheManager.del(existingRecord.wikiId)
        await this.cacheManager.del(existingRecord.coingeckoId)

        this.pm2Service.sendDataToProcesses(
          `${Pm2Events.DELETE_CACHE} ${MarketCapService.name}`,
          {
            keys: [existingRecord.wikiId, existingRecord.coingeckoId],
          },
          Number(process.env.pm_id),
        )
        await marketCapIdRepository.update(existingRecord, {
          wikiId,
        })
      } else {
        await marketCapIdRepository.insert({
          kind,
          coingeckoId,
          wikiId,
        })
      }

      await this.collectAll(
        this.marketData(
          {
            kind,
            limit,
            offset,
          },
          true,
        ),
      )

      if (
        Number(process.env.pm_id) &&
        this.CACHED_WIKI &&
        this.INCOMING_WIKI_ID
      ) {
        this.pm2Service.sendDataToProcesses(
          `${Pm2Events.UPDATE_CACHE} ${MarketCapService.name}`,
          { data: this.CACHED_WIKI, key: this.INCOMING_WIKI_ID },
          Number(process.env.pm_id),
        )
      }

      return true
    } catch (e) {
      this.logger.error('Error in updateMistachIds:', e)
      return false
    } finally {
      this.INCOMING_WIKI_ID = null
      this.CACHED_WIKI = null
    }
  }

  private async getCacheDataByCategory(
    data: MarketCapSearchType,
    kind: RankType,
    category?: string,
  ): Promise<(TokenRankListData | NftRankListData)[]> {
    if (kind === RankType.TOKEN) {
      switch (category) {
        case 'stablecoins':
          return data.stableCoins as unknown as TokenRankListData[]
        case 'artificial-intelligence':
          return data.aiTokens as unknown as TokenRankListData[]
        case 'meme-token':
          return data.memeTokens as unknown as TokenRankListData[]
        case undefined:
          return data.tokens as unknown as TokenRankListData[]
        default: {
          const matchedCategory = await this.getCacheCateoryKey(category)
          if (matchedCategory && data[matchedCategory.key]) {
            return data[matchedCategory.key] as unknown as TokenRankListData[]
          }
          return data.tokens as unknown as TokenRankListData[]
        }
      }
    }
    return data.nfts as unknown as NftRankListData[]
  }

  async getCacheCateoryKey(category: string) {
    const stablecoinCategories = await this.cacheManager.get<
      { id: string; name: string; key: string }[]
    >(STABLECOIN_CATEGORIES_CACHE_KEY)
    const lowerCategory = category?.toLowerCase()
    const matchedCategory = stablecoinCategories?.find(
      (cat) =>
        cat.id.toLowerCase().includes(lowerCategory!) ||
        cat.name.toLowerCase().includes(lowerCategory!) ||
        cat.key.toLowerCase().includes(lowerCategory!),
    )
    return matchedCategory
  }

  async wildcardSearch(args: MarketCapSearchInputs) {
    const data: MarketCapSearchType | null | undefined =
      await this.cacheManager.get(
        args.hasWiki
          ? MARKETCAP_SEARCH_CACHE_KEY
          : NO_WIKI_MARKETCAP_SEARCH_CACHE_KEY,
      )

    if (!data || !args.search) {
      return [] as (TokenRankListData | NftRankListData)[]
    }

    const cache = await this.getCacheDataByCategory(
      data,
      args.kind,
      args.category,
    )

    const lowerSearchTerm = args.search.toLowerCase()
    let result

    if (args.founders) {
      result = cache?.filter((item) => {
        const tokenMatch = item.founderWikis?.some(
          (founder) =>
            founder.id.toLowerCase().includes(lowerSearchTerm) ||
            founder.title.toLowerCase().includes(lowerSearchTerm),
        )
        return tokenMatch
      }) as TokenRankListData[]
    } else {
      result = cache?.filter((item: any) => {
        const nftMatch =
          item.nftMarketData?.id.toLowerCase().includes(lowerSearchTerm) ||
          item.nftMarketData?.name.toLowerCase().includes(lowerSearchTerm)
        const tokenMatch =
          item.tokenMarketData?.id.toLowerCase().includes(lowerSearchTerm) ||
          item.tokenMarketData?.name.toLowerCase().includes(lowerSearchTerm)

        return (
          (nftMatch as NftRankListData) || (tokenMatch as TokenRankListData)
        )
      })
    }

    return result || []
  }
}

export default MarketCapService
