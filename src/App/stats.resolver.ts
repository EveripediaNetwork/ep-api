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
      .select(['activity.wikiId', 'COUNT(*)', 'Min(datetime)', 'Max(datetime)'])
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `activity.userId = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e' AND w."hidden" = false`,
      )
      .groupBy('activity.wikiId, activity.id')
      .getMany()
    console.log(respo)
    return respo
  }

  @Query(() => Number)
  async wikisEditedByUser() {
    return true
  }
}

export default StatsResolver
