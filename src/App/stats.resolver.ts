import { UseInterceptors } from '@nestjs/common'
import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql'
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

@UseInterceptors(SentryInterceptor)
@Resolver(() => Activity)
class StatsResolver {
  constructor(private connection: Connection) {}

  @Query(() => WikiStats)
  async wikisCreated() {
    const repository = this.connection.getRepository(Activity)
    const respo = await repository
      .createQueryBuilder('activity')
      .select(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(1655308896) AND activity.datetime <= to_timestamp(1658216851))`,
        'amount',
      )
      .addSelect('Min(datetime)', 'starton')
      .addSelect('Max(datetime)', 'endon')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '0'`)
      .printSql()
      .getRawMany()
    console.log(respo)
    return respo[0]
  }

  @Query(() => WikiStats)
  async wikisEdited() {
    const repository = this.connection.getRepository(Activity)
    const respo = await repository
      .createQueryBuilder('activity')
      .select(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(1655308896) AND activity.datetime <= to_timestamp(1658216851))`,
        'amount',
      )
      .addSelect('Min(datetime)', 'starton')
      .addSelect('Max(datetime)', 'endon')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '1'`)
      .printSql()
      .getRawMany()
    console.log(respo)
    return respo[0]
  }

  @Query(() => WikiUserStats)
  async wikisCreatedByUser() {
    const repository = this.connection.getRepository(Activity)
    const respo = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(1655308896) AND activity.datetime <= to_timestamp(1658216851))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `activity.userId = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e' AND w."hidden" = false AND type = '0'`,
      )
      .groupBy('activity.userId')
      .printSql()
      .getRawMany()
    console.log(respo)
    return respo[0]
  }

  @Query(() => WikiUserStats)
  async wikisEditedByUser() {
    const repository = this.connection.getRepository(Activity)
    const respo = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(1655308896) AND activity.datetime <= to_timestamp(1658216851))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `activity.userId = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e' AND w."hidden" = false AND type = '1'`,
      )
      .groupBy('activity.userId')
      .printSql()
      .getRawMany()
    console.log(respo)
    return respo[0]
  }
}

export default StatsResolver
