import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { UseInterceptors, UseGuards } from '@nestjs/common'
import PageViewsService from './pageViews.service'
import AuthGuard from '../utils/admin.guard'
import AdminLogsInterceptor from '../utils/adminLogs.interceptor'
import { WikiViewArgs, WikiViews } from './pageviews.dto'
import { ArgsById } from '../general.args'

@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => Number)
class PageViewsResolver {
  constructor(private pageViewsService: PageViewsService) {}

  @Mutation(() => Number)
  async wikiViewCount(@Args() args: ArgsById, @Context() ctx: any) {
    return this.pageViewsService.updateCount(args.id, ctx.req.ip)
  }

  @Query(() => [WikiViews])
  @UseGuards(AuthGuard)
  async wikiViews(@Args() args: WikiViewArgs) {
    return this.pageViewsService.getWikiViews(args)
  }
}

export default PageViewsResolver
