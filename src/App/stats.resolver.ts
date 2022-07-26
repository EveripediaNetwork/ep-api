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
  starton!: Date

  @Field()
  endon!: Date

  @Field(() => String)
  amount!: string
}
@ObjectType()
export class WikiUserStats {
  @Field()
  address!: string

  @Field(() => String)
  amount!: string
}

@ArgsType()
class DateArgs {
  @Field(() => Int)
  startdate = Math.round(new Date().setDate(new Date().getDate() - 7) / 1000)

  @Field(() => Int)
  enddate = Math.round(Date.now() / 1000)
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

  @Query(() => WikiStats)
  async wikisCreated(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startdate}) AND activity.datetime <= to_timestamp(${args.enddate}))`,
        'amount',
      )
      .addSelect('Min(datetime)', 'starton')
      .addSelect('Max(datetime)', 'endon')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '0'`)
      .getRawMany()
    return response[0]
  }

  @Query(() => WikiStats)
  async wikisEdited(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startdate}) AND activity.datetime <= to_timestamp(${args.enddate}))`,
        'amount',
      )
      .addSelect('Min(datetime)', 'starton')
      .addSelect('Max(datetime)', 'endon')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '1'`)
      .getRawMany()
    return response[0]
  }

  @Query(() => WikiUserStats)
  async wikisCreatedByUser(@Args() args: UserArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startdate}) AND activity.datetime <= to_timestamp(${args.enddate}))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `activity.userId = '${args.userId}' AND w."hidden" = false AND type = '0'`,
      )
      .groupBy('activity.userId')
      .getRawMany()
    return response[0]
  }

  @Query(() => WikiUserStats)
  async wikisEditedByUser(@Args() args: UserArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startdate}) AND activity.datetime <= to_timestamp(${args.enddate}))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `activity.userId = '${args.userId}' AND w."hidden" = false AND type = '1'`,
      )
      .groupBy('activity.userId')
      .getRawMany()
    return response[0]
  }
}

export default StatsResolver
