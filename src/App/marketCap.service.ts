/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
/* eslint-disable no-sequences */
/* eslint-disable import/no-cycle */
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import { Cache } from 'cache-manager'
import { createUnionType, Field, ObjectType } from '@nestjs/graphql'
import Wiki from '../Database/Entities/wiki.entity'
import { MarketCapInputs, RankType } from './marketCap.resolver'
import { cryptocurrencyIds, nftIds } from './marketCapIds'

@ObjectType()
export class NftListData {
  @Field()
  floor_price_eth!: number

  @Field()
  floor_price_usd!: number

  @Field()
  market_cap_usd!: number

  @Field()
  floor_price_in_usd_24h_percentage_change!: number
}

@ObjectType()
export class TokenListData {
  @Field()
  current_price!: number

  @Field()
  market_cap!: number

  @Field()
  market_cap_rank!: number

  @Field()
  price_change_24h!: number

  @Field()
  market_cap_change_24h!: number
}

@ObjectType()
export class TokenRankListData extends Wiki {
  @Field(() => TokenListData, { nullable: true })
  tokenMarketData?: TokenListData
}
@ObjectType()
export class NftRankListData extends Wiki {
  @Field(() => NftListData, { nullable: true })
  nftMarketData?: NftListData
}

export const MarketRankData = createUnionType({
  name: 'MarketRankData',
  types: () => [NftRankListData, TokenRankListData] as const,
  resolveType(value) {
    if (value.nftMarketData) {
      return 'NftRankListData'
    }
    if (value.tokenMarketData) {
      return 'TokenRankListData'
    }

    return true
  },
})

@Injectable()
class MarketCapService {
  constructor(
    private connection: Connection,
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async marketData(kind: string, amount: number, page: number) {
    let result

    if (kind === RankType.NFT) {
      result = await this.nftMarketData(amount, page)
      return result
    }

    let data
    try {
      data = await this.httpService
        .get(
          ` https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${amount}&page=${
            page === 0 ? 1 : page
          }&sparkline=false`,
        )
        .toPromise()
    } catch (err: any) {
      console.error(err.message)
    }

    result = data?.data.map(async (element: any) => {
      const wiki = await this.findWiki(element.id, cryptocurrencyIds)

      if (!wiki) {
        return null
      }
      const wikiAndCryptoMarketData = {
        ...wiki,
        tokenMarketData: {
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

  async findWiki(id: string, exceptionIds: typeof nftIds) {
    const repository = this.connection.getRepository(Wiki)
    const wiki =
      (await repository.findOne({
        id,
        hidden: false,
      })) ||
      (await repository.findOne({
        id: exceptionIds.find(async (e: any) => {
          id === e.coingeckoId
        })?.wikiId,
        hidden: false,
      }))

    return wiki
  }

  async getNfts(amount: number, page: number) {
    let data
    try {
      data = await this.httpService
        .get(
          `
            https://api.coingecko.com/api/v3/nfts/list?order=market_cap_usd_desc&per_page=${amount}&page=${
            page === 0 ? 1 : page
          }`,
        )
        .toPromise()
    } catch (err: any) {
      console.error(err.message)
    }
    return data?.data
  }

  async nftMarketData(amount: number, page: number) {
    const nfts = await this.getNfts(amount, page)

    const marketCap = nfts.map(async (d: any) => {
      let nftMarketCap
      try {
        nftMarketCap = await this.httpService
          .get(`https://api.coingecko.com/api/v3/nfts/${d.id}`)
          .toPromise()
      } catch (err: any) {
        console.error(err.message)
      }
      return nftMarketCap?.data
    })

    const marketData = await Promise.all(marketCap)

    const result = marketData.map(async (element: any) => {
      const wiki = await this.findWiki(element.id, nftIds)

      if (!wiki) {
        return null
      }
      const wikiAndNftMarketData = {
        ...wiki,
        nftMarketData: {
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

    const result = await this.marketData(
      args.kind as string,
      args.limit,
      args.offset,
    )

    await this.cacheManager.set(key, result, { ttl: 600000 })

    if (args.kind === RankType.NFT) return result as unknown as NftRankListData
    return result as unknown as TokenRankListData
  }
}

export default MarketCapService
