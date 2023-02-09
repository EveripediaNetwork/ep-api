import { registerEnumType } from '@nestjs/graphql'
import { getConnection } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'

export enum OrderBy {
  ID = 'id',
  VIEWS = 'views',
  BLOCK = 'block',
  CREATED = 'created',
  UPDATED = 'updated',
}

export enum ActivityType {
    CREATED,
    UPDATED 
}

export enum Direction {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(OrderBy, { name: 'OrderBy' })
registerEnumType(Direction, { name: 'Direction' })
registerEnumType(ActivityType, { name: 'ActivityType' })

export const orderWikis = (order: OrderBy, direction: Direction) => {
  let sortValue = {}
  switch (order) {
    case OrderBy.UPDATED: {
      sortValue = { updated: direction }
      break
    }
    case OrderBy.CREATED: {
      sortValue = { created: direction }
      break
    }
    case OrderBy.ID: {
      sortValue = { id: direction }
      break
    }
    case OrderBy.VIEWS: {
      sortValue = { views: direction }
      break
    }
    case OrderBy.BLOCK: {
      sortValue = { block: direction }
      break
    }
    default:
      sortValue = { updated: direction }
  }
  return sortValue
}

export const queryWikisCreated = async (
  user: { id?: string },
  limit: number,
  offset: number,
): Promise<Activity[] | undefined> => {
  const { id } = user
  const repository = getConnection().getRepository(Activity)

  return repository
    .createQueryBuilder('activity')
    .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
    .where(
      `LOWER(activity.userId) = '${id?.toLowerCase()}' AND w."hidden" = false`,
    )
    .andWhere("activity.type = '0'")
    .groupBy('activity.wikiId, activity.id')
    .limit(limit)
    .offset(offset)
    .orderBy('datetime', 'DESC')
    .getMany()
}

export const queryWikisEdited = async (
  user: { id?: string },
  limit: number,
  offset: number,
): Promise<Activity[] | undefined> => {
  const { id } = user
  const repository = getConnection().getRepository(Activity)
  return repository.query(`
    SELECT d."wikiId", d."ipfs", d."type", d."content", d."userId", d."id", d."datetime" FROM
        (
            SELECT "wikiId", Max(datetime) as MaxDate  
            FROM activity
            WHERE type = '1' AND "activity"."userId" = '${id}'
            GROUP BY "activity"."wikiId"
        ) r
        INNER JOIN "activity" d
        ON d."wikiId"=r."wikiId" AND d.datetime=r.MaxDate
        INNER JOIN "wiki" w
        ON w."id" = d."wikiId"
        WHERE w."hidden" = false
        ORDER BY d."datetime" DESC
        LIMIT ${limit}
        OFFSET ${offset}
    `)
}
