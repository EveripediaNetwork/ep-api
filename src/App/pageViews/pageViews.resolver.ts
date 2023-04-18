import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { UseInterceptors, UseGuards } from '@nestjs/common'
import PageViewsService from './pageViews.service'
import { ArgsById } from '../utils/queryHelpers'
import AuthGuard from '../utils/admin.guard'
import AdminLogsInterceptor from '../utils/adminLogs.interceptor'
import PaginationArgs from '../pagination.args'
import { WikiViews } from './pageviews.dto'

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
  async wikiViews(@Args() args: PaginationArgs) {
    return this.pageViewsService.getWikiViews(args)
  }
}

export default PageViewsResolver
