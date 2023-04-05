/* eslint-disable max-classes-per-file */
import {
	Args,
	Context,
	Mutation,
	Parent,
	Query,
	ResolveField,
	Resolver,
} from "@nestjs/graphql";
import { DataSource } from "typeorm";
import { UseGuards, UseInterceptors } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Wiki from "../../Database/Entities/wiki.entity";
import { IWiki } from "../../Database/Entities/types/IWiki";
import Activity from "../../Database/Entities/activity.entity";
import { Author } from "../../Database/Entities/types/IUser";
import AuthGuard from "../utils/admin.guard";
import { SlugResult } from "../utils/validSlug";
import {
	RevalidatePageService,
	RevalidateEndpoints,
} from "../revalidatePage/revalidatePage.service";
import AdminLogsInterceptor from "../utils/adminLogs.interceptor";
import {
	ByIdArgs,
	CategoryArgs,
	LangArgs,
	PageViewArgs,
	PromoteWikiArgs,
	TitleArgs,
	WikiUrl,
} from "./wiki.dto";
import WikiService from "./wiki.service";

@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => Wiki)
class WikiResolver {
	constructor(
		private dataSource: DataSource,
		private revalidate: RevalidatePageService,
		private eventEmitter: EventEmitter2,
		private wikiService: WikiService,
	) {}

	@Query(() => Wiki, { nullable: true })
	async wiki(@Args() args: ByIdArgs) {
		return this.wikiService.findWiki(args);
	}

	@Query(() => [Wiki])
	async wikis(@Args() args: LangArgs) {
		return this.wikiService.getWikis(args);
	}

	@Query(() => [Wiki])
	async promotedWikis(@Args() args: LangArgs) {
		return this.wikiService.getPromotedWikis(args);
	}

	@Query(() => [Wiki])
	async wikisByCategory(@Args() args: CategoryArgs) {
		return this.wikiService.getWikisByCategory(args);
	}

	@Query(() => [Wiki])
	async wikisByTitle(@Args() args: TitleArgs) {
		return this.wikiService.getWikisByTitle(args);
	}

	@Query(() => [Wiki])
	async wikisPerVisits(@Args() args: PageViewArgs) {
		return this.wikiService.getWikisPerVisits(args);
	}

	@Query(() => SlugResult)
	async validWikiSlug(@Args() args: ByIdArgs) {
		return this.wikiService.getValidWikiSlug(args);
	}

	@Query(() => [Wiki])
  @UseGuards(AuthGuard)
	async wikisHidden(@Args() args: LangArgs) {
		return this.wikiService.getWikisHidden(args);
	}

	@Query(() => [WikiUrl])
	async addressToWiki(
		@Args('address', { type: () => String }) address: string,
	) {
		return this.wikiService.getAddressTowiki(address);
	}

	@Mutation(() => Wiki, { nullable: true })
  @UseGuards(AuthGuard)
	async promoteWiki(@Args() args: PromoteWikiArgs, @Context() ctx: any) {
		const cacheId = ctx.req.ip + args.id;
		const wiki = await this.wikiService.promoteWiki(args);
		if (wiki) {
			await this.revalidate.revalidatePage(RevalidateEndpoints.PROMOTE_WIKI);
			this.eventEmitter.emit("admin.action", `${cacheId}`);
		}
		return wiki;
	}

	@Mutation(() => Wiki, { nullable: true })
  @UseGuards(AuthGuard)
	async hideWiki(@Args() args: ByIdArgs, @Context() ctx: any) {
		const cacheId = ctx.req.ip + args.id;

		const wiki = await this.wikiService.hideWiki(args);

		if (wiki) {
			await this.revalidate.revalidatePage(
				RevalidateEndpoints.HIDE_WIKI,
				undefined,
				wiki.id,
				wiki.promoted,
			);
			this.eventEmitter.emit("admin.action", `${cacheId}`);
		}
		return wiki;
	}

	@Mutation(() => Wiki, { nullable: true })
  @UseGuards(AuthGuard)
	async unhideWiki(@Args() args: ByIdArgs, @Context() ctx: any) {
		const cacheId = ctx.req.ip + args.id;

		const wiki = await this.wikiService.unhideWiki(args);

		if (wiki) {
			await this.revalidate.revalidatePage(
				RevalidateEndpoints.HIDE_WIKI,
				undefined,
				wiki.id,
				wiki.promoted,
			);
			this.eventEmitter.emit("admin.action", `${cacheId}`);
		}
		return wiki;
	}

	@ResolveField(() => Author)
	async author(@Parent() wiki: IWiki) {
		const { id } = wiki;
		const repository = this.dataSource.getRepository(Activity);
		const res = await repository.query(`SELECT "userId", u.* 
        FROM activity
        LEFT JOIN "user_profile" u ON u."id" = "userId"
        WHERE "wikiId" = '${id}' AND "type" = '0'`);
		return { id: res[0]?.userId, profile: { ...res[0] } || null };
	}
}

export default WikiResolver;
