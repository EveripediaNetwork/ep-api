import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'
import PageViewsService from './pageViews.service'
import { ArgsById } from '../utils/queryHelpers'

@Resolver(() => Number)
class PageViewsResolver {
  constructor(private pageViewsService: PageViewsService) {}

  @Mutation(() => Number)
  async wikiViewCount(
    @Args() args: ArgsById,
    @Context() ctx: any,
  ) {
    return this.pageViewsService.updateCount(args.id, ctx.req.ip)
  }
}

export default PageViewsResolver
