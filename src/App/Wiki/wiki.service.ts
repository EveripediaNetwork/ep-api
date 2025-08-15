/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Injectable, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { Brackets, DataSource, Repository, SelectQueryBuilder } from 'typeorm'
import { Cache } from 'cache-manager'
import { HttpService } from '@nestjs/axios'
import slugify from 'slugify'
import Wiki from '../../Database/Entities/wiki.entity'
import { updateDates } from '../utils/queryHelpers'
import { ValidSlug, Valid, Slug } from '../utils/validSlug'
import {
  ByIdArgs,
  CategoryArgs,
  EventArgs,
  EventDefaultArgs,
  ExplorerArgs,
  LangArgs,
  PromoteWikiArgs,
  TitleArgs,
  WikiUrl,
  eventTag,
} from './wiki.dto'
import { DateArgs, Count } from './wikiStats.dto'
import { Direction } from '../general.args'
import { PageViewArgs } from '../pageViews/pageviews.dto'
import DiscordWebhookService from '../utils/discordWebhookService'
import Explorer from '../../Database/Entities/explorer.entity'
import Events from '../../Database/Entities/Event.entity'
import { eventWiki } from '../Tag/tag.dto'

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
    const wiki = await (await this.repository())
      .createQueryBuilder('wiki')
      .where('wiki.languageId = :lang', { lang: args.lang })
      .andWhere('wiki.id = :id', { id: args.id })
      .getOne()

    return wiki
  }

  async events(id: string) {
    const eventRepo = this.dataSource.getRepository(Events)
    const event = await eventRepo.findBy({ wikiId: id })
    return event || []
  }

  async getWikis(
    args: LangArgs,
    featuredEvents: boolean,
  ): Promise<Wiki[] | []> {
    const queryBuilder = (await this.repository())
      .createQueryBuilder('wiki')
      .where('wiki.languageId = :lang', { lang: args.lang })
      .andWhere('wiki.hidden = false')

    if (featuredEvents !== undefined) {
      this.filterFeaturedEvents(queryBuilder, featuredEvents)
    }
    return queryBuilder
      .orderBy(`wiki.${args.order}`, args.direction)
      .skip(args.offset)
      .take(args.limit)
      .getMany() as unknown as Wiki[]
  }

  filterFeaturedEvents(
    queryBuilder: SelectQueryBuilder<Wiki>,
    featuredEvents: boolean,
  ) {
    if (!featuredEvents) {
      queryBuilder
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('taggedWiki.id')
            .from(Wiki, 'taggedWiki')
            .leftJoin('taggedWiki.tags', 'excludedTag')
            .where('LOWER(excludedTag.id) = LOWER(:eventTag)')
            .getQuery()
          return `wiki.id NOT IN ${subQuery}`
        })
        .setParameter('eventTag', eventTag)
    } else {
      queryBuilder
        .innerJoin('wiki.tags', 'tag')
        .andWhere('LOWER(tag.id) = LOWER(:eventTag)', { eventTag })
    }
  }

  async getPromotedWikis(
    args: LangArgs,
    featuredEvents = false,
  ): Promise<Wiki[] | []> {
    const queryBuilder = (await this.repository()).createQueryBuilder('wiki')

    queryBuilder
      .where('wiki.languageId = :lang', { lang: args.lang })
      .andWhere('wiki.promoted > 0')
      .andWhere('wiki.hidden = false')
      .orderBy('wiki.promoted', args.direction)
      .skip(args.offset)
      .take(args.limit)

    this.filterFeaturedEvents(queryBuilder, featuredEvents)

    const promotedWikis = await queryBuilder.getMany()
    return promotedWikis
  }

  async getWikiIdTitleAndSummary(): Promise<
    { id: string; title: string; summary: string; hidden: boolean }[]
  > {
    const wikiIdsList:
      | { id: string; title: string; summary: string; hidden: boolean }[]
      | null
      | undefined = await this.cacheManager.get('wikiIdsList')
    if (wikiIdsList) return wikiIdsList
    const response = await (await this.repository())
      .createQueryBuilder('wiki')
      .select('wiki.id')
      .addSelect('wiki.title')
      .addSelect('wiki.summary')
      .addSelect('wiki.hidden')
      .where('wiki.hidden = false')
      .orderBy('wiki.id', 'ASC')
      .getMany()

    await this.cacheManager.set('wikiIdsList', response, 3600 * 1000)
    return response
  }

  async getWikisByCategory(
    args: CategoryArgs,
    eventArgs?: EventArgs,
  ): Promise<Wiki[] | []> {
    const { lang, limit, offset, tagIds } = eventArgs || args
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

    if (tagIds) {
      query.innerJoin('wiki.tags', 'tag')
      if (tagIds.length > 1) {
        query.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('subWiki.id')
            .from(Wiki, 'subWiki')
            .innerJoin('subWiki.tags', 'subTag')
            .where('LOWER(subTag.id) = ANY(:tagIds)', {
              tagIds: tagIds.map((tag) => tag.toLowerCase()),
            })
            .andWhere('subWiki.hidden = :hidden', { hidden: false })
            .groupBy('subWiki.id')
            .having('COUNT(DISTINCT subTag.id) > 1')
            .getQuery()
          return `wiki.id IN ${subQuery}`
        })
      } else {
        query.andWhere('LOWER(tag.id) = LOWER(:ev)', { ev: tagIds[0] })
      }
    }

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
      .leftJoinAndSelect('events', 'events', 'events.wikiId = wiki.id')
      .andWhere('LOWER(tag.id) = LOWER(:tagId)', { tagId: eventTag })

    return this.applyDateFilter(baseQuery, dates) as SelectQueryBuilder<Wiki>
  }

  eventDateOrder(query: SelectQueryBuilder<Wiki>, direction: Direction) {
    query.addOrderBy(
      `COALESCE("events".date, "events"."${
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
            'events.date >= :start OR (:other BETWEEN events.multiDateStart AND  events.multiDateEnd) OR (events.multiDateStart >= :other)',
            { start: startDate, other: startDate },
          )
        }

        if (args.endDate) {
          query.andWhere(
            `
            CASE
                WHEN events.date IS NOT NULL THEN 
                    events.date BETWEEN :start AND :end
                ELSE 
                    events.multiDateStart <= :end AND events.multiDateEnd >= :start
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
    const slugs = await (await this.repository()).query(
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

  async getWikisHidden(
    args: LangArgs,
    featuredEvents = false,
  ): Promise<Wiki[] | []> {
    const queryBuilder = (await this.repository()).createQueryBuilder('wiki')

    queryBuilder
      .where('wiki.languageId = :lang', { lang: args.lang })
      .andWhere('wiki.hidden = true')
      .orderBy('wiki.updated', 'DESC')
      .skip(args.offset)
      .take(args.limit)

    this.filterFeaturedEvents(queryBuilder, featuredEvents)

    const hiddenWikis = await queryBuilder.getMany()

    return hiddenWikis
  }

  async searchExplorers(explorer: string) {
    const repo = this.dataSource.manager.getRepository(Explorer)
    return repo
      .createQueryBuilder('explorer')
      .where('LOWER(explorer.id) LIKE LOWER(:id)', { id: `%${explorer}%` })
      .getMany()
  }

  async getExplorers(args: ExplorerArgs) {
    const repo = this.dataSource.manager.getRepository(Explorer)
    return repo
      .createQueryBuilder('explorer')
      .where('hidden = :hidden', { hidden: args.hidden })
      .orderBy(args.order, args.direction)
      .skip(args.offset)
      .take(args.limit)
      .getMany()
  }

  async countExplorers(args: ExplorerArgs) {
    const repo = this.dataSource.manager.getRepository(Explorer)
    const count = await repo
      .createQueryBuilder('explorer')
      .where('hidden = :hidden', { hidden: args.hidden })
      .getCount()

    return { count }
  }

  async addExplorer(args: Explorer) {
    const repo = this.dataSource.manager.getRepository(Explorer)
    const existExplorer = await repo.findOneBy({ ...args })
    if (!args.baseUrl.startsWith('https') || existExplorer) {
      return null
    }
    const slugId = slugify(args.explorer, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    })

    const newExplorer = repo.create({
      ...args,
      id: slugId,
    })
    await repo.save(newExplorer)
    return newExplorer
  }

  async updateExplorer(args: Explorer) {
    const repo = this.dataSource.manager.getRepository(Explorer)
    const existExplorer = await repo.findOneBy({ id: args.id })

    if (!existExplorer) {
      return false
    }

    await repo.update({ id: args.id }, args)
    return true
  }

  async getAddressToWiki(address: string): Promise<WikiUrl[]> {
    const ids = await (await this.repository()).query(
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
    const { id, level, featuredEvents } = args
    const wiki = (await this.repository()).findOneBy({ id })

    const queryBuilder = (await this.repository()).createQueryBuilder('wiki')

    if (level > 0) {
      queryBuilder
        .andWhere('wiki.promoted = :level', { level })
        .andWhere('wiki.hidden = false')

      this.filterFeaturedEvents(queryBuilder, featuredEvents)
    }

    const promotedWiki = await queryBuilder.getOne()

    if (promotedWiki) {
      await (await this.repository())
        .createQueryBuilder()
        .update(Wiki)
        .set({ promoted: 0 })
        .where('id = :id', { id: promotedWiki.id })
        .execute()
    }

    await (await this.repository())
      .createQueryBuilder()
      .update(Wiki)
      .set({ promoted: level })
      .where('id = :id', { id })
      .execute()

    await this.reOrderPromotedwikis(featuredEvents)

    return wiki
  }

  async hideWiki(args: ByIdArgs): Promise<Wiki | null> {
    const wiki = await (await this.repository()).findOneBy({ id: args.id })
    const tags = (await wiki?.tags) || []

    await (await this.repository())
      .createQueryBuilder()
      .update(Wiki)
      .set({ hidden: true, promoted: 0 })
      .where('id = :id', { id: args.id })
      .execute()

    await this.reOrderPromotedwikis(eventWiki(tags))
    return wiki
  }

  async reOrderPromotedwikis(featuredEvents: boolean) {
    const currentPromotions = await this.getPromotedWikis(
      {
        lang: 'en',
        direction: 'ASC',
      } as unknown as LangArgs,
      featuredEvents,
    )

    if (currentPromotions.length > 0) {
      for (let index = 0; index < currentPromotions.length; index += 1) {
        await (await this.repository())
          .createQueryBuilder()
          .update(Wiki)
          .set({ promoted: index + 1 })
          .where('id = :id', { id: currentPromotions[index].id })
          .execute()
      }
    }
  }

  async unhideWiki(args: ByIdArgs): Promise<Wiki | null> {
    const wiki = await (await this.repository()).findOneBy({ id: args.id })
    await (await this.repository())
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
    const tagAndCatergory = `category_${args.category}_tags_${
      args.tagIds?.join('_') || 'none'
    }`
    const count: any | undefined = await this.cacheManager.get(tagAndCatergory)
    if (count) return count
    const query = await (await this.repository())
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

    if (args.tagIds && args.tagIds.length > 0) {
      query
        .innerJoin('wiki.tags', 'tag')
        .andWhere('tag.id IN (:...tagIds)', { tagIds: args.tagIds })
    }

    const response = await query.getRawOne()
    await this.cacheManager.set(args.category, response, 3600 * 1000)
    return response
  }

  async getFullLinkedWikis(ids: string[]): Promise<(Wiki | null)[]> {
    if (!ids) return []
    const fullLinkedWikis: (Wiki | null)[] = []
    if (ids && ids.length > 0) {
      for (const id of ids) {
        const f = await this.findWiki({ id, lang: 'en' })
        fullLinkedWikis.push(f)
      }
    }
    return fullLinkedWikis.filter((item) => item !== null)
  }

  async getPopularEvents(args: EventDefaultArgs) {
    const query = (await this.repository())
      .createQueryBuilder('wiki')
      .innerJoin('wiki.tags', 'tag')
      .leftJoinAndSelect('events', 'events', 'events.wikiId = wiki.id')
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
