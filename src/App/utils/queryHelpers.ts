import { getConnection } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'

export enum SortBy {
  ALPHABET_ASC = 'ALPB ASC',
  ALPHABET_DESC = 'ALPB DESC',
}

export enum OrderBy {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type SortTypes = SortBy | OrderBy

export const orderWikis = (sortValue: SortTypes) => {
  let sort = {}
  switch (sortValue) {
    case OrderBy.ASC:
      sort = { updated: 'ASC' }
      break
    case SortBy.ALPHABET_ASC:
      sort = { id: 'ASC' }
      break
    case SortBy.ALPHABET_DESC:
      sort = { id: 'DESC' }
      break
    default:
      sort = { updated: 'DESC' }
  }
  return sort
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
