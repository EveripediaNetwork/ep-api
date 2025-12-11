/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
import { DataSource, In } from 'typeorm'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import {
  BASE_URL_COINGECKO_API,
  baseCoingeckoUrl,
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
  wiki: Wiki | null
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

  private async findWikis(
    category: string,
    items: { index: number; id: string; rankPageWiki: RankPageWiki | null }[],
  ): Promise<
    { index: number; id: string; rankPageWiki: RankPageWiki | null }[]
  > {
    const missingItems = await this.checkCacheAndGetMissing(items)

    if (missingItems.length === 0) {
      return items
    }

    const idMapping = await this.getIdMapping(category, missingItems)
    const wikiResults = await this.fetchWikis(category, idMapping)
    const enrichedResults = await this.enrichWikisWithRelatedData(wikiResults)

    await this.cacheResults(missingItems, enrichedResults)

    return this.mergeResults(items, enrichedResults)
  }

  private async checkCacheAndGetMissing(
    items: { index: number; id: string; rankPageWiki: RankPageWiki | null }[],
  ): Promise<{ index: number; id: string }[]> {
    const missingItems: { index: number; id: string }[] = []

    const cacheLookups = items.map((item) =>
      this.cacheManager.get<RankPageWiki>(item.id),
    )
    const cachedResults = await Promise.all(cacheLookups)
    items.forEach((item, i) => {
      const cachedWiki = cachedResults[i]
      if (cachedWiki) {
        item.rankPageWiki = cachedWiki
      } else {
        missingItems.push({ index: item.index, id: item.id })
      }
    })

    return missingItems
  }

  private async getIdMapping(
    category: string,
    missingItems: { index: number; id: string }[],
  ): Promise<{ coingeckoId: string; wikiId: string; index: number }[]> {
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)

    const marketCapIds = await marketCapIdRepository.find({
      where: {
        coingeckoId: In(missingItems.map((m) => m.id)),
        kind: category as RankType,
      },
      select: ['wikiId', 'coingeckoId'],
    })

    const marketCapIdMap = new Map(
      marketCapIds.map((m) => [m.coingeckoId, m.wikiId]),
    )
    return missingItems.map((mis) => ({
      coingeckoId: mis.id,
      wikiId: marketCapIdMap.get(mis.id) || '',
      index: mis.index,
    }))
  }

  private async fetchWikis(
    category: string,
    idMapping: { coingeckoId: string; wikiId: string; index: number }[],
  ): Promise<{ index: number; wiki: Wiki | null }[]> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const baseQuery = wikiRepository
      .createQueryBuilder('wiki')
      .select([
        'wiki.id',
        'wiki.title',
        'wiki.ipfs',
        'wiki.metadata',
        'wiki.images',
      ])

    const wikiQuery = () =>
      baseQuery
        .clone()
        .addSelect('wiki.linkedWikis')
        .leftJoinAndSelect('wiki.tags', 'tags')

    const matchedWikiIds = idMapping.filter((f) => f.wikiId)
    const notMatchedWikiIds = idMapping.filter((f) => !f.wikiId)

    const wikiResults: { index: number; wiki: Wiki | null }[] = []

    if (matchedWikiIds.length > 0) {
      const wikis = await this.fetchWikisByIds(
        wikiQuery(),
        matchedWikiIds.map((f) => f.wikiId),
      )
      wikiResults.push(
        ...matchedWikiIds.map((matched) => ({
          index: matched.index,
          wiki: wikis.find((w) => w.id === matched.wikiId) || null,
        })),
      )
    }

    if (notMatchedWikiIds.length > 0) {
      const wikis = await this.fetchWikisByIds(
        wikiQuery(),
        notMatchedWikiIds.map((f) => f.coingeckoId),
      )
      const foundIds = new Set(wikis.map((w) => w.id))
      const stillNotFound = notMatchedWikiIds.filter(
        (f) => !foundIds.has(f.coingeckoId),
      )

      wikiResults.push(
        ...notMatchedWikiIds.map((matched) => ({
          index: matched.index,
          wiki: wikis.find((w) => w.id === matched.coingeckoId) || null,
        })),
      )

      if (stillNotFound.length > 0) {
        await this.fetchWikisByCoingeckoUrl(
          category,
          stillNotFound,
          wikiQuery(),
          wikiResults,
        )
      }
    }

    return wikiResults
  }

  private async fetchWikisByIds(query: any, ids: string[]): Promise<Wiki[]> {
    return await query
      .where('wiki.id IN (:...ids) AND wiki.hidden = false', { ids })
      .getMany()
  }

  private async fetchWikisByCoingeckoUrl(
    category: string,
    notFoundItems: { coingeckoId: string; index: number }[],
    wikiQuery: any,
    wikiResults: { index: number; wiki: Wiki | null }[],
  ): Promise<void> {
    const urlsToSearch = notFoundItems.map(
      (id) =>
        `${baseCoingeckoUrl}/${category === 'cryptocurrencies' ? 'coins' : 'nft'}/${id.coingeckoId}`,
    )

    const wikisByUrl = await wikiQuery
      .where('wiki.hidden = false')
      .andWhere(
        `EXISTS (
        SELECT 1
        FROM json_array_elements(wiki.metadata) AS meta
        WHERE meta->>'id' = 'coingecko_profile' 
          AND meta->>'value' IN (:...urls)
      )`,
        { urls: urlsToSearch },
      )
      .getMany()

    const urlToWikiMap = new Map<string, Wiki>()
    for (const wiki of wikisByUrl) {
      const coingeckoMeta = wiki.metadata?.find(
        (meta: any) => meta.id === 'coingecko_profile',
      )
      if (coingeckoMeta?.value) {
        const coingeckoId = coingeckoMeta.value.split('/').pop()
        if (coingeckoId) {
          urlToWikiMap.set(coingeckoId, wiki)
        }
      }
    }

    for (const item of notFoundItems) {
      const foundWiki = urlToWikiMap.get(item.coingeckoId)
      if (foundWiki) {
        const existingIndex = wikiResults.findIndex(
          (r) => r.index === item.index,
        )
        if (existingIndex !== -1) {
          wikiResults[existingIndex].wiki = foundWiki
        }
      }
    }
  }

  private async enrichWikisWithRelatedData(
    wikiResults: { index: number; wiki: Wiki | null }[],
  ): Promise<Map<number, RankPageWiki | null>> {
    const { allFounderIds, allBlockchainIds, allWikiIds } =
      this.collectRelatedIds(wikiResults)

    const [foundersMap, blockchainsMap, eventsMap] =
      await this.fetchRelatedData(allFounderIds, allBlockchainIds, allWikiIds)

    return this.buildEnrichedResults(
      wikiResults,
      foundersMap,
      blockchainsMap,
      eventsMap,
    )
  }

  private collectRelatedIds(
    wikiResults: { index: number; wiki: Wiki | null }[],
  ) {
    const allFounderIds = new Set<string>()
    const allBlockchainIds = new Set<string>()
    const allWikiIds = new Set<string>()

    for (const { wiki } of wikiResults) {
      if (wiki?.id) {
        allWikiIds.add(wiki.id)
        wiki.linkedWikis?.founders?.forEach((id) => allFounderIds.add(id))
        wiki.linkedWikis?.blockchains?.forEach((id) => allBlockchainIds.add(id))
      }
    }

    return { allFounderIds, allBlockchainIds, allWikiIds }
  }

  private async fetchRelatedData(
    allFounderIds: Set<string>,
    allBlockchainIds: Set<string>,
    allWikiIds: Set<string>,
  ): Promise<[Map<string, Wiki>, Map<string, Wiki>, Map<string, any[]>]> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const eventsRepository = this.dataSource.getRepository(Events)

    const baseQuery = wikiRepository
      .createQueryBuilder('wiki')
      .select([
        'wiki.id',
        'wiki.title',
        'wiki.ipfs',
        'wiki.metadata',
        'wiki.images',
      ])

    const [foundersArray, blockchainsArray, eventsArray] = await Promise.all([
      allFounderIds.size > 0
        ? baseQuery
            .clone()
            .where('wiki.id IN (:...ids) AND wiki.hidden = false', {
              ids: Array.from(allFounderIds),
            })
            .getMany()
        : [],
      allBlockchainIds.size > 0
        ? baseQuery
            .clone()
            .where('wiki.id IN (:...ids) AND wiki.hidden = false', {
              ids: Array.from(allBlockchainIds),
            })
            .getMany()
        : [],
      allWikiIds.size > 0
        ? eventsRepository.query(
            `SELECT * FROM events WHERE "wikiId" = ANY($1)`,
            [Array.from(allWikiIds)],
          )
        : [],
    ])

    const foundersMap = new Map(foundersArray.map((f) => [f.id, f]))
    const blockchainsMap = new Map(blockchainsArray.map((b) => [b.id, b]))
    const eventsMap = new Map<string, any[]>()

    for (const event of eventsArray) {
      if (!eventsMap.has(event.wikiId)) {
        eventsMap.set(event.wikiId, [])
      }
      eventsMap.get(event.wikiId)!.push(event)
    }

    return [foundersMap, blockchainsMap, eventsMap]
  }

  private buildEnrichedResults(
    wikiResults: { index: number; wiki: Wiki | null }[],
    foundersMap: Map<string, Wiki>,
    blockchainsMap: Map<string, Wiki>,
    eventsMap: Map<string, any[]>,
  ): Map<number, RankPageWiki | null> {
    const resultsMap = new Map<number, RankPageWiki | null>()

    for (const { index, wiki } of wikiResults) {
      if (!wiki) {
        resultsMap.set(index, null)
        continue
      }

      const founders =
        wiki.linkedWikis?.founders
          ?.map((id) => foundersMap.get(id))
          .filter(Boolean) || []

      const blockchain =
        wiki.linkedWikis?.blockchains
          ?.map((id) => blockchainsMap.get(id))
          .filter(Boolean) || []

      const events = eventsMap.get(wiki.id) || []
      const wikiWithEvents = { ...wiki, events }

      resultsMap.set(index, {
        wiki: wikiWithEvents,
        founders,
        blockchain,
      } as RankPageWiki)
    }

    return resultsMap
  }

  private async cacheResults(
    missingItems: { index: number; id: string }[],
    resultsMap: Map<number, RankPageWiki | null>,
  ): Promise<void> {
    for (const item of missingItems) {
      const rankPageWiki = resultsMap.get(item.index)
      if (rankPageWiki) {
        await this.cacheManager.set(item.id, rankPageWiki)
      }
    }
  }

  private mergeResults(
    items: { index: number; id: string; rankPageWiki: RankPageWiki | null }[],
    resultsMap: Map<number, RankPageWiki | null>,
  ): { index: number; id: string; rankPageWiki: RankPageWiki | null }[] {
    return items.map((item) => ({
      ...item,
      rankPageWiki: resultsMap.get(item.index) ?? item.rankPageWiki,
    }))
  }

  async getWikiData(
    coinsData: Record<any, any> | undefined,
    kind: RankType,
    delay = false,
  ): Promise<RankPageWiki[]> {
    const k = kind.toLowerCase()

    const batchSize = 100
    const allWikis: (RankPageWiki | null)[] = []

    if (coinsData) {
      for (let i = 0; i < coinsData.length; i += batchSize) {
        const batch = coinsData.slice(i, i + batchSize)
        const batchItems = await this.findWikis(
          k,
          batch.map((element: any, index: number) => ({
            index,
            id: element.id,
            rankPageWiki: null,
          })),
        )
        const sortedItems = batchItems.sort((a, b) => a.index - b.index)
        allWikis.push(...sortedItems.map((item) => item.rankPageWiki))
        if (delay) {
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
    }
    return allWikis as RankPageWiki[]
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
