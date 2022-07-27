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

@ObjectType()
export class WikiStats {
  @Field()
  startOn!: Date

  @Field()
  endOn!: Date

  @Field(() => Int)
  amount!: number
}
@ObjectType()
export class WikiUserStats {
  @Field()
  address!: string

  @Field(() => Int)
  amount!: number
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
}

export default StatsResolver
