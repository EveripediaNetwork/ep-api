import { UseInterceptors } from '@nestjs/common'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import PageViewsService from './pageViews.service'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Number)
class PageViewsResolver {
  constructor(
    private connection: Connection,
    private pageViewsService: PageViewsService,
  ) {}

  @Mutation(() => Number)
  async wikiViewCount(@Args('id', { type: () => String }) id: string) {
    const repository = this.connection.getRepository(Wiki)

    const wiki = await repository.findOneOrFail({
      id,
    })
    return this.pageViewsService.updateCount(wiki.id)
  }
}

export default PageViewsResolver
