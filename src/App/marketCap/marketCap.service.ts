/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
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

  private RANK_LIMIT = 2000

  private API_KEY: string

  private INCOMING_WIKI_ID!: string

  private CACHED_WIKI!: RankPageWiki

  private RANK_LIST = 'default-list'

  private RANK_STABLECOINS_LIST = 'stablecoins-list'

  private RANK_AI_LIST = 'ai-coins-list'

  private RANK_NFT_LIST = 'nft-list'

  constructor(
    private dataSource: DataSource,
    private pm2Service: Pm2Service,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.API_KEY = this.configService.get('COINGECKO_API_KEY') as string
  }

  private async findWiki(
    id: string,
    category: string,
  ): Promise<RankPageWiki | null> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const eventsRepository = this.dataSource.getRepository(Events)
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)

    const baseCoingeckoUrl = 'https://www.coingecko.com/en'
    const coingeckoProfileUrl = `${baseCoingeckoUrl}/${
      category === 'cryptocurrencies' ? 'coins' : 'nft'
    }/${id}`

    const cachedWiki: RankPageWiki | null | undefined =
      await this.cacheManager.get(id)

    if (cachedWiki?.wiki) {
      return {
        ...cachedWiki,
        wiki: {
          ...cachedWiki.wiki,
          created: new Date(cachedWiki.wiki.created),
        },
      } as RankPageWiki
    }

    const marketCapId = await marketCapIdRepository.findOne({
      where: { coingeckoId: id, kind: category as RankType },
      select: ['wikiId'],
    })

    const noCategoryId = marketCapId?.wikiId || id

    const baseQuery = wikiRepository
      .createQueryBuilder('wiki')
      .select('wiki.id')
      .addSelect('wiki.title')
      .addSelect('wiki.ipfs')
      .addSelect('wiki.images')

    const wikiQuery = baseQuery
      .clone()
      .addSelect('wiki.metadata')
      .addSelect('wiki.created')
      .addSelect('wiki.linkedWikis')
      .leftJoinAndSelect('wiki.tags', 'tags')

    const wikiResult =
      (await wikiQuery
        .where('wiki.id = :id AND wiki.hidden = false', {
          id: noCategoryId,
        })
        .getOne()) ||
      (await wikiQuery
        .andWhere(
          `EXISTS (
                    SELECT 1
                    FROM json_array_elements(wiki.metadata) AS meta
                    WHERE meta->>'id' = 'coingecko_profile' AND meta->>'value' = :url
            )`,
          { url: coingeckoProfileUrl },
        )
        .where('wiki.id = :id AND wiki.hidden = false', { id })
        .getOne()) ||
      (await wikiQuery
        .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
          categoryId: category,
        })
        .where('wiki.id = :id AND wiki.hidden = false', { id })
        .getOne())

    const [founders, blockchain] = await Promise.all([
      (async () => {
        if (wikiResult?.linkedWikis?.founders) {
          const founderResults = []
          for (const f of wikiResult.linkedWikis.founders) {
            const result = await baseQuery
              .where('wiki.id = :id AND wiki.hidden = false', {
                id: f,
              })
              .getOne()
            if (result) {
              founderResults.push(result)
            }
          }
          return founderResults
        }
        return []
      })(),
      (async () => {
        if (wikiResult?.linkedWikis?.blockchains) {
          const blockchainResults = []
          for (const b of wikiResult.linkedWikis.blockchains) {
            const result = await baseQuery
              .where('wiki.id = :id AND wiki.hidden = false', {
                id: b,
              })
              .getOne()
            if (result) {
              blockchainResults.push(result)
            }
          }
          return blockchainResults
        }
        return []
      })(),
    ])

    const events =
      (await eventsRepository.query(
        `SELECT * FROM events WHERE "wikiId" = $1`,
        [wikiResult?.id],
      )) || []

    const wiki = wikiResult && { ...wikiResult, events }

    const result = { wiki, founders, blockchain }

    if (this.INCOMING_WIKI_ID === wiki?.id) {
      this.CACHED_WIKI = result as RankPageWiki
    }

    await this.cacheManager.set(id, result, 60 * 60 * 1000) // Set cache for 1 hour

    return result as unknown as RankPageWiki
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
    const BATCH_SIZE = 50
    const DELAY_MS = 2000
    const results: (RankPageWiki | null)[] = []

    try {
      for (let i = 0; i < coinsData.length; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, coinsData.length)
        const batchPromises = []

        for (let j = i; j < batchEnd; j += 1) {
          const element = coinsData[j]

          if (!element?.id) continue

          batchPromises.push(this.findWiki(element.id, kindLower))
        }

        const batchResults = await Promise.all(batchPromises)

        results.push(...(batchResults.filter(Boolean) as RankPageWiki[]))

        if (delay && batchEnd < coinsData.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
        }
      }

      return results as RankPageWiki[]
    } catch (error) {
      this.logger.error(
        'Error retrieving wiki data:',
        error instanceof Error ? error.message : error,
      )
      return null
    }
  }

  async marketData(args: MarketCapInputs, reset = false) {
    const { kind } = args

    const data = await this.cgMarketDataApiCall(args, reset)
    const wikis = await this.getWikiData(data || [], kind)

    if (!data?.length || !wikis?.length) {
      return []
    }

    const processedResults = await Promise.all(
      data.map((element: any, index: number) => {
        const wiki = index < wikis.length ? wikis[index] : null
        return this.processMarketElement(element, wiki, kind)
      }),
    )

    return processedResults
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
      ...rankpageWiki.wiki,
      tags: rankpageWiki.wiki.__tags__,
      founderWikis: rankpageWiki.founders,
      blockchainWikis: rankpageWiki.blockchain,
      ...marketData,
    }
  }

  async cgMarketDataApiCall(
    args: MarketCapInputs,
    reset = false,
  ): Promise<Record<any, any>[] | undefined> {
    try {
      const { kind, category, limit = 250, offset = 0 } = args
      const results = await this.fetchMarketData(
        kind,
        category,
        limit,
        offset,
        reset,
      )
      return results?.slice(0, this.RANK_LIMIT)
    } catch (error) {
      this.logger.error(
        'Failed to fetch market data:',
        error instanceof Error ? error.message : error,
      )
      return []
    }
  }

  private async fetchMarketData(
    kind: RankType,
    category?: string,
    limit = 250,
    offset = 0,
    reset = false,
  ): Promise<Record<any, any>[] | undefined> {
    const baseUrl = 'https://pro-api.coingecko.com/api/v3/'
    const perPage = limit
    const totalPages = Math.ceil(this.RANK_LIMIT / perPage)
    const startPage = Math.ceil(offset / perPage) + 1
    const categoryParam = category ? `category=${category}&` : ''

    const allData: Record<any, any>[] = []
    let lastUrl: string | undefined

    for (let page = startPage; page <= totalPages; page += 1) {
      const url = this.buildApiUrl(baseUrl, kind, categoryParam, perPage, page)
      lastUrl = url

      const cachedData = await this.tryGetFromCache(url, reset)
      if (cachedData) {
        allData.push(...cachedData)
        break
      }

      const freshData = await this.fetchAndCacheData(url)
      if (freshData) {
        allData.push(...freshData)
      }

      if (allData.length >= limit) {
        break
      }
    }

    if (lastUrl) {
      Globals.REFRESH_CACHE_KEY = lastUrl
    }

    return allData
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
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'x-cg-pro-api-key': this.API_KEY,
          },
        }),
      )

      if (response?.data) {
        await this.cacheManager.set(url, response.data, 180 * 1000) // Cache for 3 minutes
        return response.data
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

  async ranks(
    args: MarketCapInputs,
  ): Promise<(TokenRankListData | NftRankListData)[]> {
    const data = await this.marketData(args)

    const result =
      args.kind === RankType.NFT
        ? (data as unknown as NftRankListData[])
        : (data as unknown as TokenRankListData[])

    return result
  }

  getCacheKey(args: MarketCapInputs) {
    let key
    switch (args.kind) {
      case RankType.TOKEN:
        switch (args.category) {
          case TokenCategory.STABLE_COINS:
            key = this.RANK_STABLECOINS_LIST
            break
          case TokenCategory.AI:
            key = this.RANK_AI_LIST
            break
          default:
            key = this.RANK_LIST
            break
        }
        break

      case RankType.NFT:
        key = this.RANK_NFT_LIST
        break
      default:
        key = this.RANK_LIST
        break
    }

    return key
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

      await this.marketData(
        {
          kind,
          limit,
          offset,
        },
        true,
      )

      if (Number(process.env.pm_id) && this.CACHED_WIKI) {
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
    }
  }

  async wildcardSearch(args: MarketCapSearchInputs) {
    const data: MarketCapSearchType | null | undefined =
      await this.cacheManager.get('marketCapSearch')

    if (!data || !args.search) {
      return [] as (TokenRankListData | NftRankListData)[]
    }

    let cache
    if (args.kind === RankType.TOKEN) {
      if (args.category === TokenCategory.STABLE_COINS) {
        cache = data.stableCoins as unknown as TokenRankListData[]
      } else if (args.category === TokenCategory.AI)
        cache = data.aiTokens as unknown as TokenRankListData[]
      else {
        cache = data.tokens as unknown as TokenRankListData[]
      }
    }
    if (args.kind === RankType.NFT) {
      cache = data.nfts as unknown as NftRankListData[]
    }

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
