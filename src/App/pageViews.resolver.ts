import { UseInterceptors } from '@nestjs/common'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import SentryInterceptor from '../sentry/security.interceptor'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Number)
class PageViewsResolver {
  constructor(private connection: Connection) {}

  @Query(() => Number)
  async updateViewCount(@Args('id', { type: () => String }) id: string) {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      id,
    })
  }
}

export default PageViewsResolver
