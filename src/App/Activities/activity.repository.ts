import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'
import {
  ActivityArgs,
  ActivityArgsByUser,
  ActivityByCategoryArgs,
  ByIdAndBlockArgs,
} from './dto/activity.dto'
import {
  IntervalArgs,
  WikiStats,
  UserArgs,
  WikiUserStats,
  DateArgs,
  Count,
} from '../Wiki/wikiStats.dto'
import ActivityService from './activity.service'

@Injectable()
class ActivityRepository extends Repository<Activity> {
  constructor(
    private dataSource: DataSource,
    private service: ActivityService,
  ) {
    super(Activity, dataSource.createEntityManager())
  }

  async countUserActivity(
    userId: string,
    intervalInHours: number,
  ): Promise<number> {
    const cr = await this.createQueryBuilder('activity')
      .select('COUNT(*)')
      .where(
        `activity.userId = :id AND activity.datetime >= NOW() - INTERVAL '${intervalInHours} HOURS'`,
        {
          id: userId,
        },
      )
      .getRawOne()
    return parseInt(cr.count, 10)
  }

  async getActivities(args: ActivityArgs): Promise<Activity[]> {
    return this.createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.language = :lang AND w."hidden" = false', {
        lang: args.lang,
      })
      .cache(
        `activities_cache_limit${args.limit}-offset${args.offset}-lang${args.lang}`,
        60000,
      )
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  async getActivitiesByWikId(args: ActivityArgs): Promise<Activity[]> {
    return this.createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where('activity.wikiId = :wikiId AND w."hidden" = false', {
        wikiId: args.wikiId,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  async getActivitiesByCategory(
    args: ActivityByCategoryArgs,
  ): Promise<Activity[]> {
    return this.createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .leftJoin(
        'wiki_categories_category',
        'c',
        'c."categoryId" = :categoryId',
        {
          categoryId: args.category,
        },
      )
      .where(
        'c."wikiId" = activity.wikiId AND  w."hidden" = false AND type = :type',
        {
          type: args.type,
        },
      )
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  async getActivitiesByUser(
    args: ActivityArgsByUser,
    fields: any[],
  ): Promise<Activity[]> {
    const query = await this.service.createCustomQuery(
      fields,
      args.userId,
      args.offset,
      args.limit,
    )
    return this.query(query)
  }

  async getActivitiesById(id: string): Promise<Activity | null> {
    return this.createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where('activity.id = :id AND w."hidden" = false', { id })
      .getOne()
  }

  async getActivitiesByWikiIdAndBlock(
    args: ByIdAndBlockArgs,
  ): Promise<Activity | null> {
    return this.createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where('activity.wikiId = :wikiId AND w."hidden" = false', {
        wikiId: args.wikiId,
      })
      .andWhere('activity.language = :lang AND activity.block = :block ', {
        lang: args.lang,
        block: args.block,
      })
      .getOne()
  }

  async queryWikisByActivityType(
    args: IntervalArgs,
    type = 0,
  ): Promise<WikiStats[] | null> {
    return this.createQueryBuilder('activity')
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
    return this.createQueryBuilder('activity')
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
    return this.createQueryBuilder('activity')
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
}

export default ActivityRepository
