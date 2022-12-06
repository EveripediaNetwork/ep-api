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
    const repository = this.connection.getRepository(Wiki)
    const paginate = (array: any[], page_size: number, page_number: number) =>
      array.slice((page_number - 1) * page_size, page_number * page_size)

    let result

    if (kind === RankType.NFT) {
      result = paginate(nftIds, amount, page === 0 ? 1 : page).map(async n => {
        const wiki = await repository.findOne({
          id: n.key,
        })
        const d = await this.httpService
          .get(`https://api.coingecko.com/api/v3/nfts/${n.id}`)
          .toPromise()
        const res = d?.data
        const wikiAndMarketData = {
          ...wiki,
          nftMarketData: {
            floor_price_eth: res.floor_price.native_currency,
            floor_price_usd: res.floor_price.usd,
            market_cap_usd: res.market_cap.usd,
            floor_price_in_usd_24h_percentage_change:
              res.floor_price_in_usd_24h_percentage_change,
          },
        }
        return wikiAndMarketData
      })
      return result
    }

    result = paginate(cryptocurrencyIds, amount, page === 0 ? 1 : page).map(
      async c => {
        console.log(c)
        const wiki = await repository.findOne({
          id: c.key,
        })
        const d = await this.httpService
          .get(
            `https://api.coingecko.com/api/v3/coins/${c.id}?localization=false&tickers=false&community_data=false&developer_data=false`,
          )
          .toPromise()
        const res = d?.data
        const wikiAndMarketData = {
          ...wiki,
          tokenMarketData: {
            current_price: res.market_data.current_price.usd,
            market_cap: res.market_data.market_cap.usd,
            market_cap_rank: res.market_cap_rank,
            price_change_24h: res.market_data.price_change_24h,
            market_cap_change_24h: res.market_data.market_cap_change_24h,
          },
        }
        return wikiAndMarketData
      },
    )
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

    const id = key
    await this.cacheManager.set(id, result, { ttl: 600000 })

    if (args.kind === RankType.NFT) return result as unknown as NftRankListData
    return result as unknown as TokenRankListData
  }
}

export default MarketCapService
