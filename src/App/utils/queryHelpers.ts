import { getConnection } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'

export enum SortTypes {
  ASC = 'ASC',
  DESC = 'DESC',
  ALPHABET_ASC = 'ALPB ASC',
  ALPHABET_DESC = 'ALPB DESC',
}

export const orderWikis = (sortValue: SortTypes) => {
  let sort = {}
  switch (sortValue) {
    case SortTypes.ASC:
      sort = { updated: 'ASC' }
      break
    case SortTypes.ALPHABET_ASC:
      sort = { id: 'ASC' }
      break
    case SortTypes.ALPHABET_DESC:
      sort = { id: 'DESC' }
      break
    default:
      sort = { updated: 'DESC' }
  }
  return sort
}

export const queryWikisCreated = (
  user: { id: string },
  limit: number,
  offset: number,
) => {
  const { id } = user
  const repository = getConnection().getRepository(Activity)
  return repository
    .createQueryBuilder('activity')
    .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
    .where(`activity.userId = '${id}' AND w."hidden" = false`)
    .andWhere("activity.type = '0'")
    .groupBy('activity.wikiId, activity.id')
    .limit(limit)
    .offset(offset)
    .orderBy('datetime', 'DESC')
    .getMany()
}
export const queryWikisEdited = (
  user: { id: string },
  limit: number,
  offset: number,
) => {
  //   const { id } = user
  //   const repository = getConnection().getRepository(Activity)
  //   return repository
  //     .createQueryBuilder('activity')
  //     .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
  //     .where(`activity.userId = '${id}' AND w."hidden" = false`)
  //     .andWhere("activity.type = '0'")
  //     .groupBy('activity.wikiId, activity.id')
  //     .limit(limit)
  //     .offset(offset)
  //     .orderBy('datetime', 'DESC')
  //     .getMany()
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
