/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  Brackets,
  DataSource,
  MoreThan,
  Repository,
  SelectQueryBuilder,
} from 'typeorm'
import { Cache } from 'cache-manager'
import { HttpService } from '@nestjs/axios'
import Wiki from '../../Database/Entities/wiki.entity'
import { orderWikis, updateDates } from '../utils/queryHelpers'
import { ValidSlug, Valid, Slug } from '../utils/validSlug'
import {
  ByIdArgs,
  CategoryArgs,
  EventArgs,
  EventDefaultArgs,
  LangArgs,
  PromoteWikiArgs,
  TitleArgs,
  WikiUrl,
  eventTag,
} from './wiki.dto'
import { DateArgs, Count } from './wikiStats.dto'
import { OrderBy, Direction } from '../general.args'
import { PageViewArgs } from '../pageViews/pageviews.dto'
import DiscordWebhookService from '../utils/discordWebhookService'

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
    return this.dataSource.manager.getRepository(Wiki)
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

    const wiki = await(await this.repository())
      .createQueryBuilder('wiki')
      .leftJoinAndSelect('wiki.wikiEvents', 'wikiEvents') // Load related wikiEvents with alias
      .where('wiki.languageId = :lang', { lang: args.lang })
      .andWhere('wiki.id = :id', { id: args.id })
      .getOne()

    return wiki
    // return (await this.repository()).findOneBy({
    //   language: { id: args.lang },
    //   id: args.id,

    // })
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
        promoted: args.direction,
      },
    })
  }

  async getWikiIdAndTitle(): Promise<{ id: string; title: string }[] | []> {
    const wikiIdsList: { id: string; title: string }[] | undefined =
      await this.cacheManager.get('wikiIdsList')
    if (wikiIdsList) return wikiIdsList
    const response = await (
      await this.repository()
    )
      .createQueryBuilder('wiki')
      .select('id')
      .addSelect('title')
      .where('hidden = false')
      .orderBy('id', 'ASC')
      .getRawMany()

    await this.cacheManager.set('wikiIdsList', response, { ttl: 3600 })
    return response
  }

  async getWikisByCategory(
    args: CategoryArgs,
    eventArgs?: EventArgs,
  ): Promise<Wiki[] | []> {
    const { lang, limit, offset } = eventArgs || args
    const startDate = (eventArgs as EventArgs)?.startDate as string
    const endDate = (eventArgs as EventArgs)?.endDate as string

    let query = (await this.repository())
      .createQueryBuilder('wiki')
      .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: args.category,
      })
      .where('wiki.language = :lang AND hidden = :status', {
        lang,
        status: false,
      })

    if (eventArgs) {
      query = this.eventsFilter(query, {
        startDate,
        endDate,
      })
    }

    switch (args.order || eventArgs?.order) {
      case 'date':
        this.eventDateOrder(query, args.direction || eventArgs?.direction)
        break

      case 'id':
        query.orderBy('wiki.id', args.direction || eventArgs?.direction)
        break

      default:
        query.orderBy(
          args.order || eventArgs?.order,
          args.direction || eventArgs?.direction,
        )
        break
    }

    return query.limit(limit).offset(offset).getMany()
  }

  async getWikisByTitle(
    args: TitleArgs,
    eventArgs?: EventArgs,
  ): Promise<Wiki[] | []> {
    const { lang, limit, offset } = eventArgs || args
    const startDate = (eventArgs as EventArgs)?.startDate as string
    const endDate = (eventArgs as EventArgs)?.endDate as string

    const title = `%${args.title.replace(/[\W_]+/g, '%').toLowerCase()}%`

    let query = (await this.repository())
      .createQueryBuilder('wiki')
      .where(
        'wiki.language = :lang AND LOWER(wiki.title) LIKE :title AND hidden = :hidden',
        {
          lang,
          title,
          hidden: false,
        },
      )

    if (eventArgs) {
      query = this.eventsFilter(query, {
        startDate,
        endDate,
      })
    }

    switch (args.order || eventArgs?.order) {
      case 'date':
        this.eventDateOrder(query, args.direction || eventArgs?.direction)
        break

      case 'id':
        query.orderBy('wiki.id', args.direction || eventArgs?.direction)
        break

      default:
        query.orderBy(
          args.order || eventArgs?.order,
          args.direction || eventArgs?.direction,
        )
        break
    }

    return query.limit(limit).offset(offset).getMany()
  }

  eventsFilter(
    query: SelectQueryBuilder<Wiki>,
    dates?: { startDate: string; endDate: string },
  ): SelectQueryBuilder<Wiki> {
    const baseQuery = query
      .innerJoin('wiki.tags', 'tag')
      .leftJoinAndSelect('wiki.wikiEvents', 'wikiEvents')
      .andWhere('LOWER(tag.id) = LOWER(:tagId)', { tagId: eventTag })

    return this.applyDateFilter(baseQuery, dates) as SelectQueryBuilder<Wiki>
  }

  eventDateOrder(query: SelectQueryBuilder<Wiki>, direction: Direction) {
    query.addSelect(
      `(SELECT 
              MAX(COALESCE("we".date, "we"."${
                direction === 'ASC' ? 'multiDateStart' : 'multiDateEnd'
              }"))
            FROM 
              "events" "we" 
            WHERE 
              "we"."wikiId" = "wiki"."id"
          )`,
      'latest_event_date',
    )

    query.addOrderBy('latest_event_date', direction)

    query.addOrderBy(
      `COALESCE("wikiEvents".date, "wikiEvents"."${
        direction === 'ASC' ? 'multiDateStart' : 'multiDateEnd'
      }")`,
      direction,
      'NULLS LAST',
    )
  }

  applyDateFilter(
    queryBuilder: SelectQueryBuilder<Wiki>,
    args: any,
  ): SelectQueryBuilder<Wiki> {
    if (!args.startDate) {
      return queryBuilder
    }

    const { startDate, endDate } = args
    return queryBuilder.andWhere(
      new Brackets((query) => {
        if (args.startDate && !args.endDate) {
          query.andWhere(
            'wikiEvents.date >= :start OR wikiEvents.multiDateStart >= :other',
            { start: startDate, other: startDate },
          )
        }
        if (args.endDate) {
          query.andWhere(
            `
            CASE
                WHEN wikiEvents.date IS NOT NULL THEN 
                    wikiEvents.date BETWEEN :start AND :end
                ELSE 
                    wikiEvents.multiDateStart <= :end AND wikiEvents.multiDateEnd >= :start
            END
        `,
            { end: endDate, start: startDate },
          )
        }
      }),
    )
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

    const currentPromotions = await this.getPromotedWikis({
      id: 'en',
      direction: 'ASC',
    } as unknown as LangArgs)

    if (currentPromotions.length > 0) {
      for (let index = 0; index < currentPromotions.length; index += 1) {
        await (
          await this.repository()
        )
          .createQueryBuilder()
          .update(Wiki)
          .set({ promoted: index + 1 })
          .where('id = :id', { id: currentPromotions[index].id })
          .execute()
      }
    }

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

  async getFullLinkedWikis(ids: string[]): Promise<(Wiki | null)[]> {
    if (!ids) return []
    const fullLinkedWikis: (Wiki | null)[] = []
    if (ids && ids.length > 0) {
      for (const id of ids) {
        const f = await this.findWiki({ id } as ByIdArgs)
        fullLinkedWikis.push(f)
      }
    }
    return fullLinkedWikis.filter((item) => item !== null)
  }

  async getPopularEvents(args: EventDefaultArgs) {
    const query = (await this.repository())
      .createQueryBuilder('wiki')
      .innerJoin('wiki.tags', 'tag')
      .leftJoinAndSelect('wiki.wikiEvents', 'wikiEvents')
      .where('LOWER(tag.id) = LOWER(:tagId)', { tagId: eventTag })
      .andWhere('wiki.hidden = false')

    this.applyDateFilter(query, args) as SelectQueryBuilder<Wiki>

    if (args.order === 'date') {
      this.eventDateOrder(query, args.direction)
    }
    query.addOrderBy('views', 'DESC').limit(args.limit).offset(args.offset)

    return query.getMany()
  }
}

export default WikiService
