import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'
import SentryInterceptor from '../sentry/security.interceptor'
import PageViewsService from './pageViews.service'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Number)
class PageViewsResolver {
  constructor(
    
    private pageViewsService: PageViewsService,
  ) {}

  @Mutation(() => Number)
  async wikiViewCount(
    @Args('id', { type: () => String }) id: string,
    @Context() ctx: any,

  ) {
    console.log('ip from context', ctx.req.ip)
    console.log('localAddress from context', ctx.req.socket.localAddress)
    console.log('remoteAddress from context', ctx.req.socket.remoteAddress)

    return this.pageViewsService.updateCount(id, ctx.req.ip)
  }
}

export default PageViewsResolver
