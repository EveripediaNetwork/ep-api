import { ArgsType, Field, registerEnumType } from '@nestjs/graphql'
import { Repository } from 'typeorm'
import { Validate } from 'class-validator'
import Activity from '../../Database/Entities/activity.entity'
import ValidStringParams from './customValidator'

export enum OrderBy {
  ID = 'id',
  VIEWS = 'views',
  BLOCK = 'block',
  CREATED = 'created',
  UPDATED = 'updated',
}

export enum ActivityType {
  CREATED = 0,
  UPDATED = 1,
}

export enum Direction {
  ASC = 'ASC',
  DESC = 'DESC',
}

@ArgsType()
export class ArgsById  {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string
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
  id: string,
  limit: number,
  offset: number,
  repo: Repository<Activity>,
): Promise<Activity[] | undefined> =>
  repo
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

export const queryWikisEdited = async (
  id: string,
  limit: number,
  offset: number,
  repo: Repository<Activity>,
): Promise<Activity[] | undefined> =>
  repo.query(`
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
