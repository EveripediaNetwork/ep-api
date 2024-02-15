import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource, MoreThan, Repository } from 'typeorm'
import { Cache } from 'cache-manager'
import { HttpService } from '@nestjs/axios'
import Wiki from '../../Database/Entities/wiki.entity'
import { orderWikis, updateDates } from '../utils/queryHelpers'
import { ValidSlug, Valid, Slug } from '../utils/validSlug'
import {
  ByIdArgs,
  CategoryArgs,
  LangArgs,
  PromoteWikiArgs,
  TitleArgs,
  WikiUrl,
} from './wiki.dto'
import { DateArgs, Count } from './wikiStats.dto'
import { OrderBy, Direction } from '../general.args'
import { PageViewArgs } from '../pageViews/pageviews.dto'
import DiscordWebhookService from '../utils/discordWebhookService'
import Events from '../../Database/Entities/types/IEvents'

@Injectable()
class WikiService {
  constructor(
    private configService: ConfigService,
    private validSlug: ValidSlug,
    private dataSource: DataSource,
    private httpService: HttpService,
    private discordService: DiscordWebhookService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getWebpageUrl() {
    return this.configService.get<string>('WEBSITE_URL') || ''
  }

  async repository(): Promise<Repository<Wiki>> {
    return this.dataSource.getRepository(Wiki)
  }

  async getWikiIds() {
    return (await this.repository()).find({
      select: ['id', 'updated'],
      where: {
        hidden: false,
      },
    })
  }

  async findWiki(args: ByIdArgs): Promise<Wiki | null> {
    return (await this.repository()).findOneBy({
      language: { id: args.lang },
      id: args.id,
    })
  }

  async getWikis(args: LangArgs): Promise<Wiki[] | []> {
    return (await this.repository()).find({
      where: {
        language: { id: args.lang },
        hidden: false,
      },
      cache: {
        id: `wikis_cache_limit${args.limit}-offset${args.offset}-lang${args.lang}-direction${args.direction}-order${args.order}`,
        milliseconds: 10000,
      },
      take: args.limit,
      skip: args.offset,
      order: orderWikis(args.order as OrderBy, args.direction as Direction),
    })
  }

  async getPromotedWikis(args: LangArgs): Promise<Wiki[] | []> {
    return (await this.repository()).find({
      where: {
        language: { id: args.lang },
        promoted: MoreThan(0),
        hidden: false,
      },
      take: args.limit,
      skip: args.offset,
      order: {
        promoted: 'DESC',
      },
    })
  }

  async getWikisByCategory(args: CategoryArgs): Promise<Wiki[] | []> {
    return (await this.repository())
      .createQueryBuilder('wiki')
      .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: args.category,
      })
      .where('wiki.language = :lang AND hidden = :status', {
        lang: args.lang,
        status: false,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  async getWikisByTitle(args: TitleArgs): Promise<Wiki[] | []> {
    return (await this.repository())
      .createQueryBuilder('wiki')
      .where(
        'wiki.language = :lang AND LOWER(wiki.title) LIKE :title AND hidden = :hidden',
        {
          lang: args.lang,
          hidden: args.hidden,
          title: `%${args.title.replace(/[\W_]+/g, '%').toLowerCase()}%`,
        },
      )
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  async getWikisPerVisits(args: PageViewArgs): Promise<Wiki[] | []> {
    const { start, end } = await updateDates(args)
    const qb = (await this.repository())
      .createQueryBuilder('wiki')
      .innerJoin('pageviews_per_day', 'p', 'p."wikiId" = wiki.id')
      .where('wiki.language = :lang AND hidden = :status', {
        lang: 'en',
        status: false,
      })
      .andWhere('p.day >= :start AND p.day <= :end', {
        start: args.startDay || start,
        end: args.endDay || end,
      })
      .limit(args.amount)
      .groupBy('wiki.id')
      .orderBy('Sum(p.visits)', 'DESC')

    if (args.category) {
      qb.innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: args.category,
      })
    }

    const response = await qb.getMany()

    return response
  }

  async getValidWikiSlug(args: ByIdArgs): Promise<Slug | Valid> {
    const slugs = await (
      await this.repository()
    ).query(
      `
        SELECT id 
        FROM wiki 
        WHERE id ~* $1 AND id LIKE $2 AND hidden = true
        ORDER BY created DESC
  `,
      [`^${args.id}(-[0-9]+)?$`, `${args.id}%`],
    )
    return this.validSlug.validateSlug(slugs[0]?.id)
  }

  async getWikisHidden(args: LangArgs): Promise<Wiki[] | []> {
    return (await this.repository()).find({
      where: {
        language: { id: args.lang },
        hidden: true,
      },
      take: args.limit,
      skip: args.offset,
      order: {
        updated: 'DESC',
      },
    })
  }

  async getAddressToWiki(address: string): Promise<WikiUrl[]> {
    const ids = await (
      await this.repository()
    ).query(
      ` SELECT id FROM 
            (
                SELECT id, json_array_elements(metadata)->>'value' AS value FROM wiki 
                WHERE hidden = false
            ) addy
        WHERE addy.value ILIKE $1
        GROUP BY id
    `,
      [`%${address}%`],
    )
    const links: [WikiUrl] = ids.map((e: { id: string }) => ({
      wiki: `${this.getWebpageUrl()}/wiki/${e.id}`,
    }))
    if (links.length < 1) {
      await this.checkEthAddress(address)
    }
    return links
  }

  async checkEthAddress(address: string): Promise<void> {
    try {
      const response = await this.httpService
        .get(`https://eth.blockscout.com/api/v2/addresses/${address}`)
        .toPromise()
      if (response?.data) {
        await this.discordService.updateAddressToWikiCache(response.data)
      }
    } catch (error: any) {
      console.error('blockscout error', error?.response.data.message)
      console.error('blockscout error', error.response.status)
    }
  }

  async promoteWiki(args: PromoteWikiArgs): Promise<Wiki | null> {
    const wiki = (await this.repository()).findOneBy({ id: args.id })
    if (args.level <= 10) {
      const promotedWikis =
        args.level > 0
          ? await (
              await this.repository()
            ).find({
              where: { promoted: args.level },
            })
          : []

      for (const promotedWiki of promotedWikis) {
        await (
          await this.repository()
        )
          .createQueryBuilder()
          .update(Wiki)
          .set({ promoted: 0 })
          .where('id = :id', { id: promotedWiki.id })
          .execute()
      }

      await (
        await this.repository()
      )
        .createQueryBuilder()
        .update(Wiki)
        .set({ promoted: args.level })
        .where('id = :id', { id: args.id })
        .execute()
      return wiki
    }
    return null
  }

  async hideWiki(args: ByIdArgs): Promise<Wiki | null> {
    const wiki = (await this.repository()).findOneBy({ id: args.id })
    await (
      await this.repository()
    )
      .createQueryBuilder()
      .update(Wiki)
      .set({ hidden: true, promoted: 0 })
      .where('id = :id', { id: args.id })
      .execute()
    return wiki
  }

  async unhideWiki(args: ByIdArgs): Promise<Wiki | null> {
    const wiki = (await this.repository()).findOneBy({ id: args.id })
    await (
      await this.repository()
    )
      .createQueryBuilder()
      .update(Wiki)
      .set({ hidden: false })
      .where('id = :id', { id: args.id })
      .execute()
    return wiki
  }

  async getPageViewsCount(args: DateArgs): Promise<Count | undefined> {
    return (await this.repository())
      .createQueryBuilder('wiki')
      .select(`Sum("views")`, 'amount')
      .where(
        'wiki.updated >= to_timestamp(:start) AND wiki.updated <= to_timestamp(:end)',
      )
      .setParameters({
        start: args.startDate,
        end: args.endDate,
      })
      .getRawOne()
  }

  async getCategoryTotal(args: CategoryArgs): Promise<Count | undefined> {
    const count: any | undefined = await this.cacheManager.get(args.category)
    if (count) return count
    const response = await (
      await this.repository()
    )
      .createQueryBuilder('wiki')
      .select('Count(wiki.id)', 'amount')
      .innerJoin('wiki_categories_category', 'wc', 'wc."wikiId" = wiki.id')
      .innerJoin(
        'category',
        'c',
        'c.id = wc."categoryId" AND c.id = :category ',
        { category: args.category },
      )
      .where('wiki.hidden = false')
      .getRawOne()
    await this.cacheManager.set(args.category, response, { ttl: 3600 })
    return response
  }

  async getFounderWikis(founders: string[]): Promise<(Wiki | null)[]> {
    const foundersWiki: (Wiki | null)[] = []
    if (founders && founders.length > 0) {
      for (const founder of founders) {
        const f = await this.findWiki({ id: founder } as ByIdArgs)
        foundersWiki.push(f)
      }
    }
    return foundersWiki.filter((item) => item !== null)
  }

  async getPopularEvents(args: LangArgs): Promise<Events[]>{
    return (await this.repository()).find({
      where: {
        language: { id: args.lang },
        hidden: false,
        views: MoreThan(200),
      },
      order: {
        views: "DESC",
      },
      take: args.limit,
      skip: args.offset,
    })
  }
}

export default WikiService
