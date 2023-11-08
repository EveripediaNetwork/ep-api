/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import {
  MarketCapInputs,
  NftRankListData,
  RankType,
  TokenRankListData,
} from './marketcap.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import { cryptocurrencyIds, nftIds } from './marketcapIds'
import Tag from '../../Database/Entities/tag.entity'
import WikiService from '../Wiki/wiki.service'

const noContentWiki = {
  id: 'no-content',
  title: 'No content',
  ipfs: 'no-content',
  created: new Date(),
  media: [],
  images: [],
  tags: [{ id: 'no-content' }],
} as unknown as Partial<Wiki>

@Injectable()
class MarketCapService {
  constructor(
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    private wikiService: WikiService,
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

    const tag = await this.getTags(noCategoryId)
    const wikiAndTags = {
      ...wiki,
      tags: [...tag],
    }
    return wiki && tag ? wikiAndTags : wiki
  }

  private async getTags(id: string) {
    const ds = this.dataSource.getRepository(Tag)
    return ds.query(
      `
        SELECT 
        "tags"."id" 
        FROM "tag" "tags" 
        INNER JOIN "wiki_tags_tag" "wiki_tags_tag" 
        ON "wiki_tags_tag"."wikiId" IN ($1) 
        AND "wiki_tags_tag"."tagId"="tags"."id"
    `,
      [id],
    )
  }

  private async cryptoMarketData(args: MarketCapInputs) {
    const { founders, category } = args
    const categoryParam = category ? `category=${category}&` : ''
    const data = await this.cgMarketDataApiCall(args, categoryParam)

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

      const founderWikis = founders
        ? await this.wikiService.getFounderWikis(
            wiki.linkedWikis?.founders as string[],
          )
        : []

      const wikiAndCryptoMarketData = {
        ...wiki,
        founderWikis,
        tokenMarketData: {
          hasWiki: true,
          ...tokenData,
        },
      }
      return wikiAndCryptoMarketData
    })

    return result
  }

  private async nftMarketData(args: MarketCapInputs) {
    const { founders } = args
    const data = await this.cgMarketDataApiCall(args)

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

      const founderWikis = founders
        ? await this.wikiService.getFounderWikis(
            wiki.linkedWikis?.founders as string[],
          )
        : []

      const wikiAndNftMarketData = {
        ...wiki,
        founderWikis,
        nftMarketData: {
          hasWiki: true,
          ...nftData,
        },
      }
      return wikiAndNftMarketData
    })

    return result
  }

  async cgMarketDataApiCall(
    args: MarketCapInputs,
    categoryParam?: string,
  ): Promise<Record<any, any> | undefined> {
    const { limit, offset, kind } = args
    let data
    const baseUrl = 'https://pro-api.coingecko.com/api/v3/'
    const paginate = `&per_page=${limit}&page=${offset === 0 ? 1 : offset}`
    const url =
      kind === RankType.TOKEN
        ? `${baseUrl}coins/markets?vs_currency=usd&${categoryParam}order=market_cap_des${paginate}`
        : `${baseUrl}nfts/markets?order=h24_volume_usd_desc${paginate}`

    try {
      data = await this.httpService
        .get(url, {
          headers: {
            'x-cg-pro-api-key': this.apiKey(),
          },
        })
        .toPromise()
    } catch (err: any) {
      console.error(err.message)
    }
    return data
  }

  async ranks(
    args: MarketCapInputs,
  ): Promise<TokenRankListData | NftRankListData> {
    const key = `finalResult/${args.kind}/${args.limit}/${args.offset}/${
      args.founders
    }${args.category ? `/${args.category}` : ''}`

    const finalCachedResult: any | undefined = await this.cacheManager.get(key)

    if (finalCachedResult) return finalCachedResult

    let result

    if (args.kind === RankType.NFT) {
      result = (await this.nftMarketData(args)) as unknown as NftRankListData
    } else {
      result = (await this.cryptoMarketData(
        args,
      )) as unknown as TokenRankListData
    }

    await this.cacheManager.set(key, result, { ttl: 180 })
    return result
  }
}

export default MarketCapService
