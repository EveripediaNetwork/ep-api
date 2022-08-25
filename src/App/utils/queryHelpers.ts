import { getConnection } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'

export enum SortBy {
  ID = 'id',
  UPDATED = 'updated',
}

export enum OrderBy {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const orderWikis = (sort: SortBy, order: OrderBy) => {
  let sortValue = {}
  switch (order && sort) {
    case OrderBy.ASC && SortBy.UPDATED: {
      sortValue = { updated: 'ASC' }
      break
    }
    case OrderBy.ASC && SortBy.ID: {
      sortValue = { id: 'ASC' }
      break
    }
    case OrderBy.DESC && SortBy.ID: {
      sortValue = { id: 'DESC' }
      break
    }
    default:
      sortValue = { updated: 'DESC' }
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
