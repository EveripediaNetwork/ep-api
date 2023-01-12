/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import Wiki from '../../Database/Entities/wiki.entity'
import { cryptocurrencyIds, nftIds } from './marketCapIds'
import {
  MarketCapInputs,
  NftRankListData,
  RankType,
  TokenRankListData,
} from './maketCap.dto'

@Injectable()
class MarketCapService {
  constructor(
    private connection: Connection,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private apiKey() {
    return this.configService.get('COINGECKO_API_KEY')
  }

  private async findWiki(id: string, exceptionIds: typeof nftIds) {
    const repository = this.connection.getRepository(Wiki)
    const wiki =
      (await repository.findOne({
        id,
        hidden: false,
      })) ||
      (await repository.findOne({
        id: exceptionIds.find((e: any) => id === e.coingeckoId)?.wikiId,
        hidden: false,
      }))

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
      const wiki = await this.findWiki(element.id, cryptocurrencyIds)

      if (!wiki) {
        return null
      }
      const wikiAndCryptoMarketData = {
        ...wiki,
        tokenMarketData: {
          image: element.image,
          name: element.name,
          alias: element.symbol,
          current_price: element.current_price,
          market_cap: element.market_cap,
          market_cap_rank: element.market_cap_rank,
          price_change_24h: element.price_change_24h,
          market_cap_change_24h: element.market_cap_change_24h,
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
          ` https://pro-api.coingecko.com/api/v3/nfts/markets?asset_platform_id=ethereum&order=market_cap_usd_desc&per_page=${amount}&page=${
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
      const wiki = await this.findWiki(element.id, nftIds)

      if (!wiki) {
        return null
      }
      const wikiAndNftMarketData = {
        ...wiki,
        nftMarketData: {
          alias: null,
          name: element.name,
          image: element.image.small,
          floor_price_eth: element.floor_price.native_currency,
          floor_price_usd: element.floor_price.usd,
          market_cap_usd: element.market_cap.usd,
          floor_price_in_usd_24h_percentage_change:
            element.floor_price_in_usd_24h_percentage_change,
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

    await this.cacheManager.set(key, result, { ttl: 600000 })
    return result
  }
}

export default MarketCapService
