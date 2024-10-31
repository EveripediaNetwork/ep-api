/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import {
  MarketCapInputs,
  NftRankListData,
  RankPageIdInputs,
  RankType,
  TokenCategory,
  TokenRankListData,
} from './marketcap.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from '../Wiki/wiki.service'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'

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
  private RANK_LIMIT = 1000

  private API_KEY: string

  private RANK_LIST = 'default-list'

  private RANK_STABLECOINS_LIST = 'stablecoins-list'

  private RANK_AI_LIST = 'ai-coins-list'

  private RANK_NFT_LIST = 'nft-list'

  constructor(
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    private wikiService: WikiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.API_KEY = this.configService.get('COINGECKO_API_KEY') as string
  }

  private async findWiki(
    id: string,
    category: string,
  ): Promise<RankPageWiki | null> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)

    const baseCoingeckoUrl = 'https://www.coingecko.com/en'
    const coingeckoProfileUrl = `${baseCoingeckoUrl}/${
      category === 'cryptocurrencies' ? 'coins' : 'nft'
    }/${id}`

    const cachedWiki: RankPageWiki | undefined = await this.cacheManager.get(id)
    if (!cachedWiki) {
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

      const wikiQuery = wikiRepository
        .createQueryBuilder('wiki')
        .select('wiki.id')
        .addSelect('wiki.title')
        .addSelect('wiki.ipfs')
        .addSelect('wiki.images')
        .addSelect('wiki.metadata')
        .addSelect('wiki.created')
        .addSelect('wiki.linkedWikis')
        .addSelect('events.type')
        .addSelect('events.date')
        .leftJoin('wiki.wikiEvents', 'events')
        .leftJoinAndSelect('wiki.tags', 'tags')

      const wiki =
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
          .where('wiki.id = :id AND wiki.hidden = false', {
            id: noCategoryId,
          })
          .getOne()) ||
        (await wikiQuery
          .innerJoin(
            'wiki.categories',
            'category',
            'category.id = :categoryId',
            {
              categoryId: category,
            },
          )
          .where('wiki.id = :id AND wiki.hidden = false', { id })
          .getOne())

      const [founders, blockchain] = await Promise.all([
        (async () => {
          if (wiki?.linkedWikis?.founders) {
            const founderResults = []
            for (const f of wiki.linkedWikis.founders) {
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
          if (wiki?.linkedWikis?.blockchains) {
            const blockchainResults = []
            for (const b of wiki.linkedWikis.blockchains) {
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

      const result = { wiki, founders, blockchain }

      await this.cacheManager.set(id, result, {
        ttl: 3600,
      })

      return result as unknown as RankPageWiki
    }

    return cachedWiki
  }

  async getWikiData(
    coinsData: Record<any, any> | undefined,
    kind: RankType,
  ): Promise<RankPageWiki[]> {
    const k = kind.toLowerCase()

    const batchSize = 50
    const allWikis: (RankPageWiki | null)[] = []

    if (coinsData) {
      for (let i = 0; i < coinsData.length; i += batchSize) {
        const batch = coinsData.slice(i, i + batchSize)

        const batchPromises = batch.map((element: any) =>
          this.findWiki(element.id, k),
        )
        const batchWikis = await Promise.all(batchPromises)

        allWikis.push(...batchWikis)
      }
    }

    return allWikis as RankPageWiki[]
  }

  async marketData(args: MarketCapInputs) {
    const { kind } = args

    const data = await this.cgMarketDataApiCall(args)
    const wikis = await this.getWikiData(data, kind)

    const processElement = (element: any, rankpageWiki: any) => {
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
          hasWiki: !!rankpageWiki.wiki,
          ...tokenData,
        },
      }

      if (!rankpageWiki.wiki) {
        return {
          ...noContentWiki,
          id: tokenData.name,
          title: tokenData.name,
          ...marketData,
        }
      }

      return {
        ...rankpageWiki.wiki,
        events: rankpageWiki.wiki.__wikiEvents__,
        tags: rankpageWiki.wiki.__tags__,
        founderWikis: rankpageWiki.founders,
        blockchainWikis: rankpageWiki.blockchain,
        ...marketData,
      }
    }

    const result = await Promise.all(
      data?.map((element: any, index: number) =>
        processElement(element, wikis[index]),
      ),
    )

    return result
  }

  async cgMarketDataApiCall(
    args: MarketCapInputs,
  ): Promise<Record<any, any> | undefined> {
    const { kind, category, limit, offset } = args
    const categoryParam = category ? `category=${category}&` : ''

    const baseUrl = 'https://pro-api.coingecko.com/api/v3/'

    const perPage = limit || 250
    const totalPages = Math.ceil(this.RANK_LIMIT / perPage)
    const pageToFetch = offset ? Math.ceil(offset / perPage) + 1 : 1

    const allData = []

    try {
      for (let page = pageToFetch; page <= totalPages; page += 1) {
        const url =
          kind === RankType.TOKEN
            ? `${baseUrl}coins/markets?vs_currency=usd&${categoryParam}order=market_cap_desc&per_page=${perPage}&page=${page}`
            : `${baseUrl}nfts/markets?order=h24_volume_usd_desc&per_page=${perPage}&page=${page}`

        const finalCachedResult: any | undefined = await this.cacheManager.get(
          url,
        )
        if (finalCachedResult) {
          allData.push(...finalCachedResult)
          break
        } else {
          const response = await this.httpService
            .get(url, {
              headers: {
                'x-cg-pro-api-key': this.API_KEY,
              },
            })
            .toPromise()
          if (response?.data) {
            allData.push(...response.data)
            await this.cacheManager.set(url, allData, { ttl: 180 })
          }
        }
        if (allData.length >= limit) {
          break
        }
      }
    } catch (err: any) {
      console.error(err.message)
    }

    return allData.slice(0, this.RANK_LIMIT)
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
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)
    try {
      const existingRecord = await marketCapIdRepository.findOne({
        where: { coingeckoId: args.coingeckoId },
      })

      if (existingRecord) {
        await marketCapIdRepository.update(
          { coingeckoId: args.coingeckoId },
          { ...args },
        )
      } else {
        await marketCapIdRepository.insert({
          ...args,
          linked: false,
        })
      }
      await this.cacheManager.del(`mismatch-${args.coingeckoId}`)
      return true
    } catch (e) {
      console.error('Error in updateMistachIds:', e)
      return false
    }
  }

  async wildcardSearch(args: MarketCapInputs) {
    if (!args.search) return []
    const cache = (await this.ranks(args)) as unknown as (
      | TokenRankListData
      | NftRankListData
    )[]

    const lowerSearchTerm = args.search.toLowerCase()

    return cache.filter((item: any) => {
      const nftMatch =
        item.nftMarketData?.id.toLowerCase().includes(lowerSearchTerm) ||
        item.nftMarketData?.name.toLowerCase().includes(lowerSearchTerm)
      const tokenMatch =
        item.tokenMarketData?.id.toLowerCase().includes(lowerSearchTerm) ||
        item.tokenMarketData?.name.toLowerCase().includes(lowerSearchTerm)

      return (nftMatch as NftRankListData) || (tokenMatch as TokenRankListData)
    })
  }
}

export default MarketCapService
