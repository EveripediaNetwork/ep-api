/* eslint-disable max-classes-per-file */
import { UseInterceptors } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import PageViews from '../Database/Entities/pageViews.entity'

@ObjectType()
export class Count {
  @Field(() => Int)
  amount!: number
}

@ObjectType()
export class WikiStats extends Count {
  @Field()
  startOn!: Date

  @Field()
  endOn!: Date
}

@ObjectType()
export class WikiUserStats extends Count {
  @Field()
  address!: string
}

@ArgsType()
class DateArgs {
  @Field(() => Int)
  startDate = Math.round(new Date().setDate(new Date().getDate() - 7) / 1000)

  @Field(() => Int)
  endDate = Math.round(Date.now() / 1000)

  @Field(() => String)
  interval = 'hour'
}

@ArgsType()
class UserArgs extends DateArgs {
  @Field(() => String)
  userId!: string
}

@ArgsType()
class EditorArgs extends DateArgs {
  @Field(() => Int)
  status = 1
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => Activity)
class StatsResolver {
  constructor(private connection: Connection) {}

  @Query(() => [WikiStats])
  async wikisCreated(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(`Count(*)`, 'amount')
      .addSelect('Min(datetime)', 'startOn')
      .addSelect('Max(datetime)', 'endOn')
      .addSelect(`date_trunc('${args.interval}', datetime) AS interval`)
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '0'`)
      .andWhere(
        `activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate})`,
      )
      .groupBy('interval')
      .orderBy('amount', 'DESC')
      .getRawMany()
    return response
  }

  @Query(() => [WikiStats])
  async wikisEdited(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(`Count(*)`, 'amount')
      .addSelect('Min(datetime)', 'startOn')
      .addSelect('Max(datetime)', 'endOn')
      .addSelect(`date_trunc('${args.interval}', datetime) AS interval`)
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '1'`)
      .andWhere(
        `activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate})`,
      )
      .groupBy('interval')
      .orderBy('amount', 'DESC')
      .getRawMany()
    return response
  }

  @Query(() => WikiUserStats)
  async wikisCreatedByUser(@Args() args: UserArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate}))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `LOWER(activity.userId) = '${args.userId.toLowerCase()}' AND w."hidden" = false AND type = '0'`,
      )
      .groupBy('activity.userId')
      .getRawOne()
    return response
  }

  @Query(() => WikiUserStats)
  async wikisEditedByUser(@Args() args: UserArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate}))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `LOWER(activity.userId) = '${args.userId.toLowerCase()}' AND w."hidden" = false AND type = '1'`,
      )
      .groupBy('activity.userId')
      .getRawOne()
    return response
  }

  @Query(() => Count)
  async editorCount(@Args() args: EditorArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(`Count(distinct activity."userId")`, 'amount')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '${args.status}'`)
      .andWhere(
        `activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate})`,
      )
      .getRawOne()
    return response
  }

  @Query(() => Count)
  async pageViewsCount(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(PageViews)
    const response = await repository
      .createQueryBuilder('pageViews')
      .select(`Sum(pageViews."views")`, 'amount')
      .leftJoin('wiki', 'w', 'w."id" = pageViews.wikiId')
      .where(
        `wiki.updated >= to_timestamp(${args.startDate}) AND wiki.updated <= to_timestamp(${args.endDate})`,
      )
      .getRawOne()
    return response
  }
}

export default StatsResolver
