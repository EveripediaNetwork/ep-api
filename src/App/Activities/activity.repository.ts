/* eslint-disable array-callback-return */
import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import gql from 'graphql-tag'
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
import { hasField } from '../Wiki/wiki.dto'

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

  activityContentFields(fields: string[]): string[] {
    const arr = fields.filter((e) => typeof e !== 'string')
    return arr.flatMap((e: any) => {
      const t: any[] = []
      if (e.name === 'content') {
        e.selections.filter((ee: string | { name: string }) => {
          if (typeof ee !== 'string' && ee.name !== undefined) {
            if (ee.name !== 'user') {
              t.push(`activity.a_${ee.name}`)
            }
          } else if (ee !== 'id') {
            t.push(`activity.a_${ee}`)
          }
        })
      }
      return t
    })
  }

  async activityQueryBuilder(
    args: any,
    query: string,
    fields: string[],
    condition: string,
    wikiId?: string,
  ): Promise<Activity[]> {
    let activityContent: string[] = []
    const ast = gql`
      ${query}
    `
    if (hasField(ast, 'content')) {
      activityContent = this.activityContentFields(fields)
    }

    let whereCondition = ''

    if (condition === 'all') {
      whereCondition = 'activity.language = :lang AND w."hidden" = false'
    } else if (condition === 'user') {
      whereCondition = 'w."hidden" = false AND activity.user = :id'
    } else if (condition === 'wikiId') {
      whereCondition = 'activity.wikiId = :wikiId AND w. "hidden" = false'
    }

    const params: any = {
      lang: args.lang,
      id: args.userId,
      wikiId: args.wikiId,
    }
    if (wikiId !== undefined) {
      params.wikiId = wikiId
    }

    const data = await this.createQueryBuilder('activity')
      .select([
        'activity.id',
        'activity.wikiId',
        'activity.userAddress',
        'activity.ipfs',
        'activity.type',
        'activity.datetime',
        'activity.block',
        ...activityContent,
      ])
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .leftJoinAndSelect('activity.user', 'user')

      .where(whereCondition, params)

      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()

    const result = data.map((e: any) => {
      let authorId = null

      if (e.a_author !== null && typeof e.a_author === 'string') {
        try {
          if (e.a_author.includes('{')) {
            authorId = JSON.parse(e.a_author).id
          } else {
            authorId = e.a_author
          }
        } catch (err) {
          console.error(err)
        }
      }

      return {
        ...e,
        content: [
          {
            id: e.wikiId,
            title: e.a_title,
            block: e.a_block,
            summary: e.a_summary,
            categories: e.a_categories,
            images: e.a_images,
            media: e.a_media,
            tags: e.a_tags,
            metadata: e.a_metadata,
            author: { id: authorId },
            content: e.a_content,
            ipfs: e.a_ipfs,
            version: e.a_version,
            transactionHash: e.a_transactionHash,
            created: e.a_created,
            updated: e.a_updated,
            user: { id: e.userAddress },
          },
        ],
      }
    })
    return result as Activity[]
  }

  async getActivities(
    args: ActivityArgs,
    query: string,
    fields: string[],
  ): Promise<Activity[]> {
    return this.activityQueryBuilder(args, query, fields, 'all')
  }

  async getActivitiesByWikId(
    args: ActivityArgs,
    query: string,
    fields: any[],
  ): Promise<Activity[]> {
    return this.activityQueryBuilder(args, query, fields, 'wikiId')
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
    query: string,
    fields: any[],
  ): Promise<Activity[]> {
    return this.activityQueryBuilder(args, query, fields, 'user')
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
