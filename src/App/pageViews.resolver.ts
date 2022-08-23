import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import PageViews from '../Database/Entities/pageViews.entity'
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
  async wikiViewCount(
    @Args('id', { type: () => String }) id: string,
    @Context() ctx: any,
  ) {
    return this.pageViewsService.updateCount(id, ctx.req.ip)
  }

  @Query(() => PageViews)
  async wikiPageViews(@Args('id', { type: () => String }) id: string) {
    const repository = this.connection.getRepository(PageViews)
    const pageViews = await repository.findOne({ wiki_id: id })
    if (!pageViews) {
      return 0 as PageViews['views']
    }
    return pageViews
  }
}

export default PageViewsResolver
