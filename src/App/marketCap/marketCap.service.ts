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
  RankPageIdInputs,
  RankType,
  TokenRankListData,
} from './marketcap.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import Tag from '../../Database/Entities/tag.entity'
import WikiService from '../Wiki/wiki.service'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'

const noContentWiki = {
  id: 'no-content',
  title: 'No content',
  ipfs: 'no-content',
  created: new Date(),
  media: [],
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
    category: string,
  ): Promise<RankPageWiki | null> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)
    const marketCapId = await marketCapIdRepository.findOne({
      where: { coingeckoId: id, kind: category as RankType },
    })

    const noCategoryId = marketCapId?.wikiId || id

    const wiki =
      (await this.findWikiByCoingeckoUrl(id, category, marketCapId?.wikiId)) ||
      (await wikiRepository
        .createQueryBuilder('wiki')
        .where('wiki.id = :id AND wiki.hidden = false', {
          id: noCategoryId,
        })
        .getOne()) ||
      (await wikiRepository
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
    const wikiResult = wiki && tag ? wikiAndTags : wiki

    const [founders, blockchain] = await Promise.all([
      this.wikiService.getFullLinkedWikis(
        wikiResult?.linkedWikis?.founders as string[],
      ) || [],
      this.wikiService.getFullLinkedWikis(
        wikiResult?.linkedWikis?.blockchains as string[],
      ) || [],
    ])

    const result = { wiki: wikiResult, founders, blockchain }
    return result as RankPageWiki
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

  async getWikiData(
    coinsData: Record<any, any> | undefined,
    args: MarketCapInputs,
  ): Promise<RankPageWiki[]> {
    const kind = args.kind.toLowerCase()
    const wikiPromises = coinsData?.data.map((element: any) =>
      this.findWiki(element.id, kind),
    )

    let wikis: RankPageWiki[] | undefined = await this.cacheManager.get(
      `wiki-${kind}-${args.limit}-${args.category}`,
    )

    if (!wikis) {
      wikis = await Promise.all(wikiPromises)
      this.cacheManager.set(`wiki-${kind}-${args.limit}`, wikis, {
        ttl: 3600,
      })
    }
    return wikis
  }

  async marketData(args: MarketCapInputs) {
    const { category, kind } = args
    const categoryParam = category ? `category=${category}&` : ''
    const data = await this.cgMarketDataApiCall(args, categoryParam)
    const wikis = await this.getWikiData(data, args)

    const processElement = (element: any, rankpageWiki: any) => {
      const tokenData =
        kind === RankType.TOKEN
          ? {
              image: element.image || '',
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
        founderWikis: rankpageWiki.founders,
        blockchainWikis: rankpageWiki.blockchain,
        ...marketData,
      }
    }

    const result = await Promise.all(
      data?.data.map((element: any, index: number) =>
        processElement(element, wikis[index]),
      ),
    )

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
      args.category ? `/${args.category}` : ''
    }`

    const finalCachedResult: any | undefined = await this.cacheManager.get(key)

    if (finalCachedResult) return finalCachedResult

    let result

    if (args.kind === RankType.NFT) {
      result = (await this.marketData(args)) as unknown as NftRankListData
    } else {
      result = (await this.marketData(args)) as unknown as TokenRankListData
    }

    await this.cacheManager.set(key, result, { ttl: 180 })
    return result
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
        })
      }
      return true
    } catch (e) {
      console.error('Error in updateMistachIds:', e)
      return false
    }
  }

  async findWikiByCoingeckoUrl(
    coingeckoId: string,
    category: string,
    id?: string,
  ): Promise<Wiki | null> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const baseCoingeckoUrl = 'https://www.coingecko.com/en'
    const coingeckoProfileUrl = `${baseCoingeckoUrl}/${
      category === 'cryptocurrencies' ? 'coins' : 'nft'
    }/${coingeckoId}`

    const queryBuilder = wikiRepository
      .createQueryBuilder('wiki')
      .where('wiki.hidden = false')
      .andWhere(
        `EXISTS (
        SELECT 1
        FROM json_array_elements(wiki.metadata) AS meta
        WHERE meta->>'id' = 'coingecko_profile' AND meta->>'value' = :url
      )`,
        { url: coingeckoProfileUrl },
      )
      .innerJoinAndSelect(
        'wiki.categories',
        'category',
        'category.id = :categoryId',
        { categoryId: category },
      )

    if (id !== undefined) {
      queryBuilder.andWhere('wiki.id = :wikiId', { wikiId: id })
    }

    const wiki = await queryBuilder.getOne()
    return wiki
  }
}

export default MarketCapService
