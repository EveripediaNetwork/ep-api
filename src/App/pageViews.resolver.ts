import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation,Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
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

}

export default PageViewsResolver
