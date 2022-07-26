import { UseInterceptors } from '@nestjs/common'
import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'

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

  @Query(() => Number)
  async wikisCreated() {
    return true
  }

  @Query(() => Number)
  async wikisEdited() {
    return true
  }

  @Query(() => WikiUserStats)
  async wikisCreatedByUser() {
    const repository = this.connection.getRepository(Activity)
    const respo = await repository
      .createQueryBuilder('activity')
      .select('activity.userId')
        .addSelect('Count(*)', 'amount')
    //   .addSelect([
    //     'activity.wikiId',
    //     'COUNT(*)',
    //     'Min(datetime)',
    //     'Max(datetime)',
    //   ])
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `activity.userId = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e' AND w."hidden" = false AND type = '0'`,
      )
      .groupBy('activity.userId')
      .printSql()
      .getRawMany()
    console.log(respo)
    return respo
  }

  @Query(() => Number)
  async wikisEditedByUser() {
     const repository = this.connection.getRepository(Activity)
     const respo = await repository
       .createQueryBuilder('activity')
       .select('activity.userId')
       .addSelect('Count(*)', 'amount')
       //   .addSelect([
       //     'activity.wikiId',
       //     'COUNT(*)',
       //     'Min(datetime)',
       //     'Max(datetime)',
       //   ])
       .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
       .where(
         `activity.userId = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e' AND w."hidden" = false AND type = '0'`,
       )
       .groupBy('activity.userId')
       .printSql()
       .getRawMany()
     console.log(respo)
     return respo
  }
}

export default StatsResolver
