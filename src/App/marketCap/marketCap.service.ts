/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
import { Brackets, DataSource, ILike, In } from 'typeorm'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import {
  MarketCapInputs,
  MarketCapSearchInputs,
  MarketCapSearchType,
  NftRankListData,
  RankPageIdInputs,
  RankType,
  TokenCategory,
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

  private async findWikiBulk(
    ids: string[],
    category: string,
  ): Promise<Map<string, RankPageWiki>> {
    if (!ids.length) return new Map()

    const wikiRepository = this.dataSource.getRepository(Wiki)
    const eventsRepository = this.dataSource.getRepository(Events)
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)

    const baseCoingeckoUrl = 'https://www.coingecko.com/en'
    const categoryPath = category === 'cryptocurrencies' ? 'coins' : 'nft'

    const resultMap = new Map<string, RankPageWiki>()
    const uncachedIds: string[] = []

    const cachedResults = await Promise.all(
      ids.map((id) => this.cacheManager.get(id)),
    )

    ids.forEach((id, index) => {
      const cached = cachedResults[index] as RankPageWiki | null | undefined

      if (cached?.wiki) {
        resultMap.set(id, {
          ...cached,
          wiki: {
            ...cached.wiki,
            created: new Date(cached.wiki.created),
          },
        } as RankPageWiki)
      } else {
        uncachedIds.push(id)
      }
    })

    if (!uncachedIds.length) return resultMap

    const marketCapIds = await marketCapIdRepository.find({
      where: {
        coingeckoId: In(uncachedIds),
        kind: category as RankType,
      },
      select: ['coingeckoId', 'wikiId'],
    })

    const idMapping = new Map(
      marketCapIds.map((m) => [m.coingeckoId, m.wikiId || m.coingeckoId]),
    )

    for (const id of uncachedIds) {
      if (!idMapping.has(id)) {
        idMapping.set(id, id)
      }
    }

    const wikiIds = Array.from(new Set(idMapping.values()))
    const coingeckoUrls = uncachedIds.map(
      (id) => `${baseCoingeckoUrl}/${categoryPath}/${id}`,
    )

    const wikis = await wikiRepository
      .createQueryBuilder('wiki')
      .select(['wiki.id', 'wiki.title', 'wiki.images', 'wiki.linkedWikis'])
      .leftJoinAndSelect('wiki.tags', 'tags')
      .leftJoin('wiki.categories', 'category')
      .where('wiki.hidden = false')
      .andWhere(
        new Brackets((qb) => {
          qb.where('wiki.id IN (:...wikiIds)', { wikiIds })
            .orWhere(
              `EXISTS (
              SELECT 1
              FROM json_array_elements(wiki.metadata) AS meta
              WHERE meta->>'id' = 'coingecko_profile' 
              AND meta->>'value' IN (:...urls)
            )`,
              { urls: coingeckoUrls },
            )
            .orWhere('category.id = :category', { category })
        }),
      )
      .getMany()

    const wikiMap = new Map(wikis.map((w) => [w.id, w]))

    const allLinkedIds = new Set<string>()

    for (const wiki of wikis) {
      if (wiki.linkedWikis?.founders) {
        wiki.linkedWikis.founders.forEach((id) => allLinkedIds.add(id))
      }
      if (wiki.linkedWikis?.blockchains) {
        wiki.linkedWikis.blockchains.forEach((id) => allLinkedIds.add(id))
      }
    }

    const linkedWikis =
      allLinkedIds.size > 0
        ? await wikiRepository
            .createQueryBuilder('wiki')
            .select(['wiki.id', 'wiki.title', 'wiki.images'])
            .where('wiki.id IN (:...ids) AND wiki.hidden = false', {
              ids: Array.from(allLinkedIds),
            })
            .getMany()
        : []

    const linkedWikiMap = new Map(linkedWikis.map((w) => [w.id, w]))

    const events =
      wikiMap.size > 0
        ? await eventsRepository.find({
            select: ['wikiId', 'title', 'type', 'date'],
            where: {
              wikiId: In(Array.from(wikiMap.keys())),
              title: ILike('Date founded'),
            },
          })
        : []

    const eventsByWikiId = new Map<string, typeof events>()
    for (const event of events) {
      if (!event.wikiId) continue
      if (!eventsByWikiId.has(event.wikiId)) {
        eventsByWikiId.set(event.wikiId, [event])
      }
    }

    for (const id of uncachedIds) {
      const wikiId = idMapping.get(id)
      const wiki = wikiId ? wikiMap.get(wikiId) : undefined

      if (!wiki) {
        const url = `${baseCoingeckoUrl}/${categoryPath}/${id}`
        const foundWiki = wikis.find((w) =>
          w.metadata?.some(
            (m) => m.id === 'coingecko_profile' && m.value === url,
          ),
        )

        if (foundWiki) {
          wikiMap.set(foundWiki.id, foundWiki)
        }
      }

      const finalWiki = wiki || wikiMap.get(id)

      if (finalWiki) {
        const founders =
          finalWiki.linkedWikis?.founders
            ?.map((fId) => linkedWikiMap.get(fId))
            .filter(Boolean) || []

        const blockchain =
          finalWiki.linkedWikis?.blockchains
            ?.map((bId) => linkedWikiMap.get(bId))
            .filter(Boolean) || []

        const wikiEvents = eventsByWikiId.get(finalWiki.id) || []

        const result: RankPageWiki = {
          wiki: { ...finalWiki, events: wikiEvents },
          founders,
          blockchain,
        } as RankPageWiki

        resultMap.set(id, result)

        await this.cacheManager.set(id, result, 60 * 60 * 1000)
      }
    }

    return resultMap
  }

  async getWikiData(
    coinsData: Record<any, any>[] | undefined,
    kind: RankType,
    delay = false,
  ): Promise<RankPageWiki[] | null> {
    if (!coinsData?.length) {
      return []
    }

    const kindLower = kind.toLowerCase()
    const BATCH_SIZE = 100
    const results: RankPageWiki[] = []

    try {
      for (let i = 0; i < coinsData.length; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, coinsData.length)
        const batch = coinsData.slice(i, batchEnd)

        const ids = batch
          .filter((element) => element?.id)
          .map((element) => element.id)

        if (!ids.length) continue

        const batchResultsMap = await this.findWikiBulk(ids, kindLower)

        for (const id of ids) {
          const result = batchResultsMap.get(id)
          if (result) {
            results.push(result)
          }
        }

        if (delay && batchEnd < coinsData.length) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      return results
    } catch (error) {
      this.logger.error(
        'Error retrieving wiki data:',
        error instanceof Error ? error.message : error,
      )
      return null
    }
  }

  async *marketData(args: MarketCapInputs, reset = false) {
    const { kind } = args

    const data = this.cgMarketDataApiCall(args, reset)
    for await (const batch of data) {
      const wikis = await this.getWikiData(batch || [], kind)

      if (!batch?.length || !wikis?.length) {
        return []
      }

      const processedResults = await Promise.all(
        batch.map((element: Record<string, any>, index: number) => {
          const wiki = index < wikis.length ? wikis[index] : null
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
    const baseUrl = 'https://pro-api.coingecko.com/api/v3/'

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
      const url = this.buildApiUrl(baseUrl, kind, categoryParam, perPage, page)
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
    const data = await this.collectAll(this.marketData(args))

    const result =
      args.kind === RankType.NFT
        ? (data as unknown as NftRankListData[])
        : (data as unknown as TokenRankListData[])

    return result
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

  private getCacheDataByCategory(
    data: MarketCapSearchType,
    kind: RankType,
    category?: TokenCategory,
  ): (TokenRankListData | NftRankListData)[] {
    if (kind === RankType.TOKEN) {
      switch (category) {
        case TokenCategory.STABLE_COINS:
          return data.stableCoins as unknown as TokenRankListData[]
        case TokenCategory.AI:
          return data.aiTokens as unknown as TokenRankListData[]
        case TokenCategory.KRW_TOKENS:
          return data.krwTokens as unknown as TokenRankListData[]
        case TokenCategory.MEME_TOKENS:
          return data.memeTokens as unknown as TokenRankListData[]
        default:
          return data.tokens as unknown as TokenRankListData[]
      }
    }
    return data.nfts as unknown as NftRankListData[]
  }

  async wildcardSearch(args: MarketCapSearchInputs) {
    const data: MarketCapSearchType | null | undefined =
      await this.cacheManager.get('marketCapSearch')

    if (!data || !args.search) {
      return [] as (TokenRankListData | NftRankListData)[]
    }

    const cache = this.getCacheDataByCategory(data, args.kind, args.category)

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
