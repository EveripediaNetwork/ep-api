/* eslint-disable import/no-cycle */
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import { Cache } from 'cache-manager'
import Wiki from '../Database/Entities/wiki.entity'
import { MarketCapInputs, RankType } from './marketCap.resolver'

const MarketData = {}

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
      .orderBy('wiki.updated', 'DESC')
      .getMany()
    return wikis
  }

  async ranks(args: MarketCapInputs): Promise<any> {
    const cachedMarketdata = await this.cacheManager.get(
      `${args.kind}/${args.limit}/${args.offset}`,
    )
    let wikis
    let data: any
    if (args.kind === RankType.TOKEN) {
      wikis = await this.wikiData('cryptocurrencies', args.limit, args.offset)
    }
    wikis = await this.wikiData(RankType.NFT, args.limit, args.offset)

    if (cachedMarketdata) {
      data = cachedMarketdata
    } else {
      data = await this.marketData(args.kind as string, args.limit, args.offset)
    }

    if (wikis && data && args.kind === RankType.TOKEN) {
      const result = wikis.map(w => ({
        ...w,
        marketData: {
          ...MarketData,
          ...data.find((d: any) => d.id === w.id),
        },
      }))
      console.log(result)
      return result
    }

    if (args.kind === RankType.NFT && data) {
      let nfts: any
      const cachedNftMarketdata = await this.cacheManager.get(
        `nftMarketData/${args.limit}/${args.offset}`,
      )
      if (cachedNftMarketdata) {
        nfts = cachedNftMarketdata
      } else {
        nfts = await this.nftMarketData(data, args.limit, args.offset)
      }
      const result = wikis.map(w => ({
        ...w,
        marketData: {
          ...MarketData,
          ...nfts.find((d: any) => d.id === w.id),
        },
      }))
      console.log(result)
      return result
    }

    return true
  }
}

export default MarketCapService
