import { Repository } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'
import { OrderBy, Direction, IntervalByDays } from '../general.args'
import { VistArgs } from '../pageViews/pageviews.dto'

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
): Promise<Activity[] | undefined> =>
  repo
    .createQueryBuilder('activity')
    .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
    .where('LOWER(activity.userId) = :id AND w."hidden" = false', {
      id: id?.toLowerCase(),
    })
    .andWhere("activity.type = '0'")
    .groupBy('activity.wikiId, activity.id')
    .limit(limit)
    .offset(offset)
    .orderBy('datetime', 'DESC')
    .getMany()

export const queryWikisEdited = async (
  id: string,
  limit: number,
  offset: number,
  repo: Repository<Activity>,
): Promise<Activity[] | undefined> =>
  repo.query(
    `
    SELECT d."wikiId", d."ipfs", d."type", d."content", d."userId", d."id", d."datetime" FROM
        (
            SELECT "wikiId", Max(datetime) as MaxDate  
            FROM activity
            WHERE type = '1' AND "activity"."userId" = $1
            GROUP BY "activity"."wikiId"
        ) r
        INNER JOIN "activity" d
        ON d."wikiId"=r."wikiId" AND d.datetime=r.MaxDate
        INNER JOIN "wiki" w
        ON w."id" = d."wikiId"
        WHERE w."hidden" = false
        ORDER BY d."datetime" DESC
        LIMIT $2
        OFFSET $3
    `,
    [id, limit, offset],
  )

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
