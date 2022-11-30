/* eslint-disable no-sequences */
/* eslint-disable import/no-cycle */
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import { Cache } from 'cache-manager'
import { createUnionType, Field, ObjectType } from '@nestjs/graphql'
import Wiki from '../Database/Entities/wiki.entity'
import { MarketCapInputs, RankType } from './marketCap.resolver'

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

export const MarketData = createUnionType({
  name: 'MarketData',
  types: () => [NftListData, TokenListData] as const,
  resolveType(value) {
    if (value.kind === RankType.NFT) {
      return 'NftListData'
    }
    if (value.valid === RankType.TOKEN) {
      return 'TokenListData'
    }
    return null
  },
})

@ObjectType()
export class RankListData extends Wiki {
  @Field(() => MarketData)
  marketData!: NftListData | TokenListData
}

@Injectable()
class MarketCapService {
  constructor(
    private connection: Connection,
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async marketData(kind: string, amount: number, page: number) {
    const coinUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${amount}&page=${page}&sparkline=false`
    const nftUrl = `https://api.coingecko.com/api/v3/nfts/list?order=market_cap_usd_desc&per_page=${amount}&page=${page}`
    let data
    try {
      data = await this.httpService
        .get(kind === RankType.TOKEN ? coinUrl : nftUrl)
        .toPromise()
    } catch (err) {
      console.error(err)
    }
    const id = `${kind}/${amount}/${page}`

    if (kind === RankType.NFT) {
      await this.cacheManager.set(id, data?.data, { ttl: 600000 }) // 10mins
    } else {
      await this.cacheManager.set(id, data?.data, { ttl: 180000 }) // 3mins
    }

    return data?.data
  }

  private async nftMarketData(data: [any], amount: number, page: number) {
    const res: any[] = []
    for (let i = 0; i < data.length; i += 1) {
      try {
        const mData = await this.httpService
          .get(
            `https://api.coingecko.com/api/v3/nfts/${data[i].asset_platform_id}/contract/${data[i].contract_address}`,
          )
          .toPromise()
        res.push(mData?.data)
      } catch (err) {
        console.error(err)
      }
    }
    const id = `nftMarketData/${amount}/${page}`
    await this.cacheManager.set(id, res, { ttl: 300000 }) // 5mins
    return res
  }

  private async wikiData(kind: string, limit: number, offset: number) {
    const repository = this.connection.getRepository(Wiki)
    const wikis = await repository
      .createQueryBuilder('wiki')
      .innerJoin(
        'wiki_categories_category',
        'category',
        'category."wikiId" = wiki.id',
      )
      .select(['wiki.id', 'wiki.title', 'wiki.user', 'wiki.images'])
      .where('category."categoryId" = :kind', {
        kind,
      })
      .limit(limit)
      .offset(offset)
      .orderBy('wiki.title', 'ASC')
      .getMany()
    return wikis
  }

  private async mapMarketData(wikis: Wiki[], data: any[]) {
    return wikis.map(w => ({
      ...w,
      marketData: {
        ...data.find((d: any) => d.id === w.id),
      },
    }))
  }

  private async tokenRanks(cachedData: any) {
    return cachedData.map((e: any) => {
      if (Object.keys(e.marketData).length > 0) {
        e.marketData = {
          current_price: e.marketData.current_price,
          market_cap: e.marketData.market_cap,
          market_cap_rank: e.marketData.market_cap_rank,
          price_change_24h: e.marketData.price_change_24h,
          market_cap_change_24h: e.marketData.market_cap_change_24h,
        }
      }
      return e
    })
  }

  private async nftRanks(cachedData: any) {
    return cachedData.map((e: any) => {
      if (Object.keys(e.marketData).length > 0) {
        e.marketData = {
          floor_price_eth: e.marketData.floor_price.native_currency,
          floor_price_usd: e.marketData.floor_price.usd,
          market_cap_usd: e.marketData.market_cap.usd,
          floor_price_in_usd_24h_percentage_change:
            e.marketData.floor_price_in_usd_24h_percentage_change,
        }
      }
      return e
    })
  }

  async ranks(args: MarketCapInputs): Promise<[RankListData]> {
    const finalCachedResult: any | undefined = await this.cacheManager.get(
      `finalResult/${args.kind}/${args.limit}/${args.offset}`,
    )

    if (finalCachedResult) return finalCachedResult

    const cachedMarketdata = await this.cacheManager.get(
      `${args.kind}/${args.limit}/${args.offset}`,
    )

    let data: any
    let result: any

    if (cachedMarketdata) {
      data = cachedMarketdata
    } else {
      data = await this.marketData(args.kind as string, args.limit, args.offset)
    }

    const wikis = await this.wikiData(
      args.kind as string,
      args.limit,
      args.offset,
    )

    if (data && args.kind === RankType.TOKEN) {
      result = await this.tokenRanks(await this.mapMarketData(wikis, data))
    }

    if (data && args.kind === RankType.NFT) {
      let nfts: any
      const cachedNftMarketdata = await this.cacheManager.get(
        `nftMarketData/${args.limit}/${args.offset}`,
      )
      if (cachedNftMarketdata) {
        nfts = cachedNftMarketdata
      } else {
        nfts = await this.nftMarketData(data, args.limit, args.offset)
      }
      result = await this.nftRanks(await this.mapMarketData(wikis, nfts))
    }

    console.log(result)

    const id = `finalResult/${args.kind}/${args.limit}/${args.offset}`
    await this.cacheManager.set(id, result, { ttl: 300000 })
    return result
  }
}

export default MarketCapService
