import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'
import {
  ActivityArgs,
  ActivityArgsByUser,
  ActivityByCategoryArgs,
  ByIdAndBlockArgs,
} from './dto/activity.dto'

@Injectable()
class ActivityService {
  constructor(private dataSource: DataSource) {}

  async repository(): Promise<Repository<Activity>> {
    return this.dataSource.getRepository(Activity)
  }

  async countUserActivity(
    userId: string,
    intervalInHours: number,
  ): Promise<number> {
    const cr = await (
      await this.repository()
    )
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
    return (await this.repository())
      .createQueryBuilder('activity')
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

  async getDBQuery(
    selections: any[],
    user: string,
    offset: number,
    limit: number,
  ): Promise<string> {
    const topLevelColumns = selections.filter(
      (e: string) => typeof e === 'string',
    )
    const topLevelColumnsWithQueryAlias = topLevelColumns.map((e: string) =>
      e === 'user' ? `atv."userId"` : `atv."${e}"`,
    )
    const topLevelSelections =
      topLevelColumnsWithQueryAlias.join(',\n            ')
    const contentJSONB = selections.filter((e: string) => typeof e === 'object')

    const contentSelections = contentJSONB[0].selections.filter(
      (e: string) =>
        typeof e === 'string' && e !== 'created' && e !== 'updated',
    )
    const contentSelectedFields = contentSelections
      .map((e: string) => `'${e}', elem->>'${e}'`)
      .join(',\n                    ')
    const contentSelectionObjects = contentJSONB[0].selections.filter(
      (e: string) => typeof e === 'object',
    )
    const contentFields = contentSelectionObjects.map((e: any) => {
      const nestedSelect = e.selections
        .map((n: string) => `'${n}', ${e.name}al->>'${n}'`)
        .join(', ')

      return e.name === 'user'
        ? `'${e.name}', jsonb_build_object('id', elem->'user'->>'id')`
        : `
                    '${e.name}', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(${nestedSelect})
                    )
                    FROM jsonb_array_elements(elem->'${e.name}') ${e.name}al
                    ), '[]'::jsonb)`
    })

    const finalQuery = `
        SELECT
            w.*,
            atv."created_timestamp",
            atv."updated_timestamp",
            atv."userAddress",
            ${topLevelSelections},
            jsonb_agg(
                jsonb_build_object(
                    ${contentSelectedFields},
                    ${contentFields}
                )
            ) AS content
        FROM
            activity atv
        LEFT JOIN wiki w
        ON w."id" = atv."wikiId" AND w."hidden" = false
        CROSS JOIN jsonb_array_elements(atv.content) elem
        WHERE atv."userId" = '${user}'
        GROUP BY w.id, atv.id
        ORDER BY atv."datetime" DESC
        OFFSET ${offset}
        LIMIT ${limit}
     `
    return finalQuery
  }

  async getActivitiesByUser(
    args: ActivityArgsByUser,
    fields: string[],
  ): Promise<Activity[]> {
    const query = await this.getDBQuery(
      fields,
      args.userId,
      args.offset,
      args.limit,
    )

    const c = await (await this.repository()).query(query)
    return c
  }

  async getActivitiesById(id: string): Promise<Activity | null> {
    return (await this.repository())
      .createQueryBuilder('activity')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where('activity.id = :id AND w."hidden" = false', { id })
      .getOne()
  }

  async getActivitiesByWikiIdAndBlock(
    args: ByIdAndBlockArgs,
  ): Promise<Activity | null> {
    return (await this.repository())
      .createQueryBuilder('activity')
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
}

export default ActivityService
