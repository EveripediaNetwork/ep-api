/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import Wiki from '../../Database/Entities/wiki.entity'
import { cryptocurrencyIds, nftIds } from './marketcapIds'
import {
  MarketCapInputs,
  NftRankListData,
  RankType,
  TokenRankListData,
} from './marketcap.dto'

const noContentWiki = {
  id: 'no-content',
  title: 'No content',
  ipfs: 'no-content',
  created: new Date(),
  media: [],
  images: [],
} as unknown as Partial<Wiki>

@Injectable()
class MarketCapService {
  constructor(
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private apiKey() {
    return this.configService.get('COINGECKO_API_KEY')
  }

  private async findWiki(
    id: string,
    exceptionIds: typeof nftIds,
    category: string,
  ) {
    const repository = this.dataSource.getRepository(Wiki)
    const mapId = exceptionIds.find((e: any) => id === e.coingeckoId)?.wikiId

    const noCategoryId = mapId || id
    const wiki =
      (await repository
        .createQueryBuilder('wiki')
        .where('wiki.id = :id AND wiki.hidden = false', {
          id: noCategoryId,
        })
        .getOne()) ||
      (await repository
        .createQueryBuilder('wiki')
        .innerJoinAndSelect(
          'wiki.categories',
          'category',
          'category.id = :categoryId',
          {
            categoryId: category,
          },
        )
        .where('wiki.id = :id AND wiki.hidden = false', { id })
        .getOne())

    return wiki
  }

  private async cryptoMarketData(amount: number, page: number) {
    let data
    try {
      data = await this.httpService
        .get(
          ` https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${amount}&page=${
            page === 0 ? 1 : page
          }&sparkline=false`,
          {
            headers: {
              'x-cg-pro-api-key': this.apiKey(),
            },
          },
        )
        .toPromise()
    } catch (err: any) {
      console.error(err.message)
    }

    const result = data?.data.map(async (element: any) => {
      const wiki = await this.findWiki(
        element.id,
        cryptocurrencyIds,
        'cryptocurrencies',
      )

      const tokenData = {
        image: element.image || '',
        name: element.name || '',
        alias: element.symbol || '',
        current_price: element.current_price || 0,
        market_cap: element.market_cap || 0,
        market_cap_rank: element.market_cap_rank || 0,
        price_change_24h: element.price_change_percentage_24h || 0,
        market_cap_change_24h: element.market_cap_change_24h || 0,
      }

      if (!wiki) {
        return {
          ...noContentWiki,
          id: tokenData.name,
          title: tokenData.name,
          tokenMarketData: {
            hasWiki: false,
            ...tokenData,
          },
        }
      }
      const wikiAndCryptoMarketData = {
        ...wiki,
        tokenMarketData: {
          hasWiki: true,
          ...tokenData,
        },
      }
      return wikiAndCryptoMarketData
    })

    return result
  }

  private async nftMarketData(amount: number, page: number) {
    let data
    try {
      data = await this.httpService
        .get(
          ` https://pro-api.coingecko.com/api/v3/nfts/markets?order=h24_volume_usd_desc&per_page=${amount}&page=${
            page === 0 ? 1 : page
          }`,
          {
            headers: {
              'x-cg-pro-api-key': this.apiKey(),
            },
          },
        )
        .toPromise()
    } catch (err: any) {
      console.error(err.message)
    }

    const result = data?.data.map(async (element: any) => {
      const wiki = await this.findWiki(element.id, nftIds, 'nfts')
      const nftData = {
        alias: null,
        name: element.name || '',
        image: element.image.small || '',
        native_currency: element.native_currency || '',
        native_currency_symbol: element.native_currency_symbol || '',
        floor_price_eth: element.floor_price.native_currency || 0,
        floor_price_usd: element.floor_price.usd || 0,
        market_cap_usd: element.market_cap.usd || 0,
        h24_volume_usd: element.volume_24h.usd || 0,
        h24_volume_native_currency: element.volume_24h.native_currency || 0,
        floor_price_in_usd_24h_percentage_change:
          element.floor_price_in_usd_24h_percentage_change || 0,
      }
      if (!wiki) {
        return {
          ...noContentWiki,
          id: nftData.name,
          title: nftData.name,
          nftMarketData: {
            hasWiki: false,
            ...nftData,
          },
        }
      }
      const wikiAndNftMarketData = {
        ...wiki,
        nftMarketData: {
          hasWiki: true,
          ...nftData,
        },
      }
      return wikiAndNftMarketData
    })

    return result
  }

  async ranks(
    args: MarketCapInputs,
  ): Promise<TokenRankListData | NftRankListData> {
    const key = `finalResult/${args.kind}/${args.limit}/${args.offset}`

    const finalCachedResult: any | undefined = await this.cacheManager.get(key)

    if (finalCachedResult) return finalCachedResult

    let result

    if (args.kind === RankType.NFT) {
      result = (await this.nftMarketData(
        args.limit,
        args.offset,
      )) as unknown as NftRankListData
    } else {
      result = (await this.cryptoMarketData(
        args.limit,
        args.offset,
      )) as unknown as TokenRankListData
    }

    await this.cacheManager.set(key, result, { ttl: 180 })
    return result
  }
}

export default MarketCapService
