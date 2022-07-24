import { UseInterceptors } from '@nestjs/common'
import { Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'


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
}

export default StatsResolver
