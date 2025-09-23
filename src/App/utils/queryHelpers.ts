import { Repository } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'
import { OrderBy, Direction, IntervalByDays } from '../general.args'
import { VistArgs } from '../pageViews/pageviews.dto'
import { UserActivity, WikiCount } from '../User/user.dto'
import { SOPHIA_ID } from '../../globalVars'

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
  id: string,
  limit: number,
  offset: number,
  repo: Repository<Activity>,
  count = false,
): Promise<UserActivity | WikiCount> => {
  const query = repo
    .createQueryBuilder('activity')
    .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
    .leftJoin('user', 'operator', 'w."operatorId" = operator."id"')
    .andWhere("activity.type = '0'")

  if (id?.toLowerCase() === SOPHIA_ID.toLowerCase()) {
    query.where('LOWER(activity.userId) = :id AND w."hidden" = false', {
      id: id?.toLowerCase(),
    })
  } else {
    query.where(
      '(LOWER(activity.userId) = :id OR LOWER(operator.id) = :id) AND w."hidden" = false',
      {
        id: id?.toLowerCase(),
      },
    )
  }

  if (count) {
    const result = await query
      .select('COUNT(DISTINCT activity.wikiId)', 'amount')
      .getRawMany()
    return { count: result[0].amount } as WikiCount
  }

  const activity = await query
    // .select('DISTINCT activity.*')
    .groupBy('activity.wikiId, activity.id')
    .orderBy('activity.datetime', 'DESC')
    .limit(limit)
    .offset(offset)
    .getMany()

  return { activity } as UserActivity
}

export const queryWikisEdited = async (
  id: string,
  limit: number,
  offset: number,
  repo: Repository<Activity>,
  count = false,
): Promise<UserActivity | WikiCount> => {
  let subquery: string

  if (id?.toLowerCase() === SOPHIA_ID.toLowerCase()) {
    subquery = `
            FROM (
                SELECT "wikiId", MAX(datetime) AS MaxDate  
                FROM activity
                WHERE type = '1' AND LOWER("activity"."userId") = LOWER($1)
                GROUP BY "activity"."wikiId"
            ) r
            INNER JOIN "activity" d
            ON d."wikiId" = r."wikiId" AND d.datetime = r.MaxDate
            INNER JOIN "wiki" w
            ON w."id" = d."wikiId"
            LEFT JOIN "user" u ON w."userId" = u."id"
            WHERE w."hidden" = false AND LOWER(u."id") = LOWER($1)
    `
  } else {
    subquery = `
            FROM (
                SELECT "wikiId", MAX(datetime) AS MaxDate  
                FROM activity
                WHERE type = '1' AND LOWER("activity"."userId") = LOWER($1)
                GROUP BY "activity"."wikiId"
            ) r
            INNER JOIN "activity" d
            ON d."wikiId" = r."wikiId" AND d.datetime = r.MaxDate
            INNER JOIN "wiki" w
            ON w."id" = d."wikiId"
            LEFT JOIN "user" u ON w."userId" = u."id"
            LEFT JOIN "user" op ON w."operatorId" = op."id"
            WHERE w."hidden" = false AND (LOWER(u."id") = LOWER($1) OR LOWER(op."id") = LOWER($1))
    `
  }

  if (count) {
    const result = await repo.query(
      `
        SELECT COUNT(DISTINCT results."wikiId") AS edits
        FROM (
            SELECT d."wikiId", d."type", d."userId", d."id"
            ${subquery}
        ) AS results;
      `,
      [id],
    )

    return { count: result[0].edits } as WikiCount
  }
  const activities = await repo.query(
    `
        SELECT d."wikiId", d."ipfs", d."type", d."content", d."userId", d."id", d."datetime" 
        ${subquery}  
        ORDER BY d."datetime" DESC
        LIMIT $2
        OFFSET $3
  
      `,
    [id, limit, offset],
  )
  return { activity: activities } as UserActivity
}

export const updateDates = async (args: VistArgs) => {
  const { interval } = args
  let start
  let end

  if (interval) {
    const range = IntervalByDays[interval]
    const oneDay = 86400000
    const intervalMap: { [key: string]: number } = {
      DAY: oneDay,
      WEEK: 7 * oneDay,
      MONTH: 30 * oneDay,
      NINETY_DAYS: 90 * oneDay,
      YEAR: 365 * oneDay,
    }

    const currentDate = new Date()
    const endDate = new Date(currentDate.getTime() - intervalMap[range])

    start = endDate.toISOString().slice(0, 10).split('-').join('/')
    end = currentDate.toISOString().slice(0, 10).split('-').join('/')
  }
  return { start, end }
}
