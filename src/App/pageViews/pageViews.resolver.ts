import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import PageViewsService from "./pageViews.service";

@Resolver(() => Number)
class PageViewsResolver {
	constructor(private pageViewsService: PageViewsService) {}

	@Mutation(() => Number)
	async wikiViewCount(
		@Args('id', { type: () => String }) id: string,
		@Context() ctx: any,
	) {
		return this.pageViewsService.updateCount(id, ctx.req.ip);
	}
}

export default PageViewsResolver;
