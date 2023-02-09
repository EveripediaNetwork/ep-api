import { Injectable } from '@nestjs/common'
import { Connection, Repository } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'
import { Author } from '../../Database/Entities/types/IUser'
import {
  ActivityArgs,
  ActivityArgsByUser,
  ActivityByCategoryArgs,
  ByIdAndBlockArgs,
} from './dto/activity.dto'

@Injectable()
class ActivityService {
  constructor(private connection: Connection) {}

  async repository(): Promise<Repository<Activity>> {
    return this.connection.getRepository(Activity)
  }

  async countUserActivity(
    userId: string,
    intervalInHours: number,
  ): Promise<number> {
    const repository = this.connection.getRepository(Activity)
    const cr = await repository
      .createQueryBuilder('activity')
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
    return (await this.repository())
      .createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .leftJoinAndSelect('activity.user', 'user')
      .where(`activity.language = '${args.lang}' AND w."hidden" = false`)
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
    return (await this.repository())
      .createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`activity.wikiId = '${args.wikiId}' AND w."hidden" = false`)
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  async getActivitiesByCategory(
    args: ActivityByCategoryArgs,
  ): Promise<Activity[]> {
    return (await this.repository())
      .createQueryBuilder('activity')
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
        `c."wikiId" = activity.wikiId AND  w."hidden" = false AND type = '${args.type}'`,
      )
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  async getActivitiesByUser(args: ActivityArgsByUser): Promise<Activity[]> {
    return (await this.repository())
      .createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(` activity.userId = :user AND w."hidden" = false`, {
        user: args.userId,
      })
      .orderBy('activity.datetime', 'DESC')
      .limit(args.limit)
      .offset(args.offset)
      .getMany()
  }

  async getActivitiesById(id: string): Promise<Activity | undefined> {
    return (await this.repository())
      .createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`activity.id = '${id}' AND w."hidden" = false`)
      .getOne()
  }

  async getActivitiesByWikiIdAndBlock(
    args: ByIdAndBlockArgs,
  ): Promise<Activity | undefined> {
    return (await this.repository())
      .createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`activity.wikiId = '${args.wikiId}' AND w."hidden" = false`)
      .andWhere(
        `activity.language = '${args.lang}' AND activity.block = '${args.block}'`,
      )
      .getOne()
  }

  async resolveAuthor(id: number): Promise<Author> {
    const res = await (
      await this.repository()
    ).query(`SELECT "userId", u.* 
        FROM activity
        LEFT JOIN "user_profile" u ON u."id" = "userId"
        WHERE activity."id" = '${id}' AND "type" = '0'`)
    return { id: res[0]?.userId, profile: { ...res[0] } || null }
  }
}

export default ActivityService
