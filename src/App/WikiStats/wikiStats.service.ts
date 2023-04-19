import { Cache } from 'cache-manager'
import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common'
import { DataSource } from 'typeorm'
import ActivityService from '../Activities/activity.service'
import {
  Count,
  DateArgs,
  IntervalArgs,
  UserArgs,
  WikiStats,
  WikiUserStats,
} from './wikiStats.dto'
import WikiService from '../Wiki/wiki.service'
import Tag from '../../Database/Entities/tag.entity'
import { CategoryArgs } from '../Wiki/wiki.dto'

@Injectable()
class WikiStatService {
  constructor(
    private dataSource: DataSource,
    private activityService: ActivityService,
    private wikiService: WikiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async queryWikisByActivityType(
    args: IntervalArgs,
    type = 0,
  ): Promise<WikiStats[] | null> {
    return (await this.activityService.repository())
      .createQueryBuilder('activity')
      .select('Count(*)', 'amount')
      .addSelect('Min(datetime)', 'startOn')
      .addSelect('Max(datetime)', 'endOn')
      .addSelect('date_trunc(:t, datetime) AS interval')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where('w."hidden" = false AND type = :type')
      .andWhere(
        'activity.datetime >= to_timestamp(:start) AND activity.datetime <= to_timestamp(:end)',
      )
      .setParameters({
        start: args.startDate,
        end: args.endDate,
        t: args.interval,
        type,
      })
      .groupBy('interval')
      .orderBy('Min(datetime)', 'ASC')
      .getRawMany()
  }

  async getWikisCreatedByUser(
    args: UserArgs,
    type = 0,
  ): Promise<WikiUserStats | undefined> {
    return (await this.activityService.repository())
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        'Count(*) FILTER(WHERE activity.datetime >= to_timestamp(:start) AND activity.datetime <= to_timestamp(:end))',
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        'LOWER(activity.userId) = :id AND w."hidden" = false AND type = :type',
      )
      .setParameters({
        id: args.userId.toLowerCase(),
        start: args.startDate,
        end: args.endDate,
        type,
      })
      .groupBy('activity.userId')
      .getRawOne()
  }

  async getEditorCount(args: DateArgs): Promise<Count | undefined> {
    return (await this.activityService.repository())
      .createQueryBuilder('activity')
      .select(`Count(distinct activity."userId")`, 'amount')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false`)
      .andWhere(
        'activity.datetime >= to_timestamp(:start) AND activity.datetime <= to_timestamp(:end)',
      )
      .setParameters({
        start: args.startDate,
        end: args.endDate,
      })
      .getRawOne()
  }

  async getPageViewsCount(args: DateArgs): Promise<Count | undefined> {
    return (await this.wikiService.repository())
      .createQueryBuilder('wiki')
      .select(`Sum("views")`, 'amount')
      .where(
        'wiki.updated >= to_timestamp(start) AND wiki.updated <= to_timestamp(end)',
      )
      .setParameters({
        start: args.startDate,
        end: args.endDate,
      })
      .getRawOne()
  }

  async getTagsPopular(args: DateArgs): Promise<Tag | undefined> {
    const repository = this.dataSource.getRepository(Tag)
    return repository.query(
      `
        SELECT "tagId" as id, COUNT(*) AS amount
        FROM public.wiki_tags_tag tags
        INNER JOIN wiki w ON w.id  = tags."wikiId"
        WHERE w.updated >= to_timestamp($1) AND w.updated <= to_timestamp($2)
        GROUP BY "tagId" 
        ORDER BY amount DESC 
        LIMIT 15       
        `,
      [args.startDate, args.endDate],
    )
  }

  async getCategoryTotal(args: CategoryArgs): Promise<Count | undefined> {
    const count: any | undefined = await this.cacheManager.get(args.category)
    if (count) return count
    const response = await (await this.wikiService.repository())
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
}

export default WikiStatService
