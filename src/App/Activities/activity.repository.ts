/* eslint-disable array-callback-return */
import { Injectable, Logger } from '@nestjs/common'
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

interface ContentField {
  name: string
  selections: Array<string | { name: string; selections: string[] }>
}

type QueryCondition = 'all' | 'user' | 'wikiId'

interface QueryParams {
  lang?: string
  id?: string
  wikiId?: string
}

@Injectable()
class ActivityRepository extends Repository<Activity> {
  private readonly logger = new Logger(ActivityRepository.name)

  constructor(
    private dataSource: DataSource,
    private service: ActivityService,
  ) {
    super(Activity, dataSource.createEntityManager())
  }

  private buildBaseQuery() {
    return this.createQueryBuilder('activity')
      .select([
        'activity.id',
        'activity.block',
        'activity.type',
        'activity.datetime',
        'activity.ipfs',
        'activity.updated_timestamp',
        'activity.created_timestamp',
        'activity.wikiId',
      ])
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .leftJoin('activity.user', 'user')
  }

  private applyConditions(
    query: any,
    condition: QueryCondition,
    params: QueryParams,
  ) {
    let whereCondition = ''
    switch (condition) {
      case 'all':
        whereCondition = 'activity.language = :lang AND w."hidden" = false'
        break
      case 'user':
        whereCondition = 'w."hidden" = false AND activity.user = :id'
        break
      case 'wikiId':
        whereCondition = 'activity.wikiId = :wikiId AND w."hidden" = false'
        break
      default:
        throw new Error(`Invalid condition: ${condition}`)
    }
    return query.where(whereCondition, params)
  }

  private mapResults(data: any[]): Activity[] {
    return data.map((e: any) => {
      let authorId = null

      if (e.a_author !== null && typeof e.a_author === 'string') {
        try {
          authorId = e.a_author.includes('{')
            ? JSON.parse(e.a_author).id
            : e.a_author
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(
              `Error parsing author data: ${error.message}`,
              error.stack,
            )
          } else {
            this.logger.error('Unknown error parsing author data')
          }
        }
      }

      return {
        ...e,
        hidden: e.hidden,
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
            hidden: e.hidden,
          },
        ],
      }
    })
  }

  activityContentFields(fields: Array<string | ContentField>): string[] {
    const contentFields = fields.filter(
      (e): e is ContentField =>
        typeof e === 'object' && e !== null && 'name' in e,
    )

    return contentFields.flatMap((e: ContentField) => {
      const t: string[] = []
      if (e.name === 'content') {
        e.selections.forEach((ee) => {
          if (typeof ee === 'object' && ee.name !== undefined) {
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
    args: ActivityArgs | ActivityArgsByUser,
    query: string,
    fields: Array<string | ContentField>,
    condition: QueryCondition,
  ): Promise<Activity[]> {
    try {
      const ast = gql`
        ${query}
      `
      const activityContent = hasField(ast, 'content')
        ? this.activityContentFields(fields)
        : []

      const baseQuery = this.buildBaseQuery().addSelect(activityContent)

      const queryWithConditions = this.applyConditions(baseQuery, condition, {
        lang: 'lang' in args ? args.lang : undefined,
        id: 'userId' in args ? args.userId : undefined,
        wikiId: 'wikiId' in args ? args.wikiId : undefined,
      })

      const data = await queryWithConditions
        .limit(args.limit)
        .offset(args.offset)
        .orderBy('datetime', 'DESC')
        .getMany()

      return this.mapResults(data)
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in activityQueryBuilder: ${error.message}`,
          error.stack,
        )
      } else {
        this.logger.error('Unknown error in activityQueryBuilder')
      }
      throw error
    }
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

  async getActivitiesByUser(userAddress: string): Promise<Activity[]> {
    const query = this.buildBaseQuery()
      .where('activity.userAddress = :userAddress', { userAddress })
      .orderBy('activity.datetime', 'DESC')

    return query.getMany()
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
    const query = this.createQueryBuilder('activity')
      .select('Count(*)', 'amount')
      .addSelect('Min(datetime)', 'startOn')
      .addSelect('Max(datetime)', 'endOn')
      .addSelect('date_trunc(:t, datetime) AS interval')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where('w."hidden" = false AND type = :type')
      .andWhere(
        'activity.datetime >= to_timestamp(:start) AND activity.datetime <= to_timestamp(:end)',
      )
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('taggedWiki.id')
          .from('wiki', 'taggedWiki')
          .leftJoin('taggedWiki.tags', 'excludedTag')
          .where('LOWER(excludedTag.id) = LOWER(:events)')
          .getQuery()
        return `w.id NOT IN ${subQuery}`
      })
      .setParameters({
        start: args.startDate,
        end: args.endDate,
        t: args.interval,
        events: 'events',
        type,
      })

    return query
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
