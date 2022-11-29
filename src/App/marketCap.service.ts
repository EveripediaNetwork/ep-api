/* eslint-disable import/no-cycle */
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import { MarketCapInputs, RankType } from './marketCap.resolver'

const MarketData = {}

@Injectable()
class MarketCapService {
  constructor(
    private connection: Connection,
    private httpService: HttpService,
  ) {}

  private async marketData(kind?: string) {
    const coinUrl =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
    const nftUrl =
      'https://api.coingecko.com/api/v3/nfts/list?order=market_cap_usd_desc&per_page=10'
    let data
    try {
      data = await this.httpService
        .get(kind === RankType.TOKEN ? coinUrl : nftUrl)
        .toPromise()
    } catch (err) {
      console.error(err)
    }

    return data?.data
  }

  private async nftMarketData(data: [any]) {
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
    let wikis
    if (args.kind === RankType.TOKEN) {
      wikis = await this.wikiData('cryptocurrencies', args.limit, args.offset)
    }
    wikis = await this.wikiData(RankType.NFT, args.limit, args.offset)
    const data: any = await this.marketData(args.kind)

    if (wikis && data && args.kind === RankType.TOKEN) {
      const result = wikis.map(w => ({
        ...w,
        marketData: {
          ...MarketData,
          ...data.find((d: any) => d.id === w.id),
        },
      }))
      return result
    }

    if (args.kind === RankType.NFT && data) {
      const nfts = await this.nftMarketData(data)
      const result = wikis.map(w => ({
        ...w,
        marketData: {
          ...MarketData,
          ...nfts.find((d: any) => d.id === w.id),
        },
      }))
      return result
    }

    return this.marketData()
  }
}

export default MarketCapService
