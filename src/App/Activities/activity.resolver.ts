import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import Activity from "../../Database/Entities/activity.entity";
import { Author } from "../../Database/Entities/types/IUser";
import { IWiki } from "../../Database/Entities/types/IWiki";
import ActivityService from "./activity.service";
import {
	ActivityArgs,
	ActivityArgsByUser,
	ActivityByCategoryArgs,
	ByIdAndBlockArgs,
} from "./dto/activity.dto";

@Resolver(() => Activity)
class ActivityResolver {
	constructor(private activityService: ActivityService) {}

	@Query(() => [Activity])
	async activities(@Args() args: ActivityArgs) {
		return this.activityService.getActivities(args);
	}

	@Query(() => [Activity])
	async activitiesByWikId(@Args() args: ActivityArgs) {
		return this.activityService.getActivitiesByWikId(args);
	}

	@Query(() => [Activity])
	async activitiesByCategory(@Args() args: ActivityByCategoryArgs) {
		return this.activityService.getActivitiesByCategory(args);
	}

	@Query(() => [Activity])
	async activitiesByUser(@Args() args: ActivityArgsByUser) {
		return this.activityService.getActivitiesByUser(args);
	}

	@Query(() => Activity)
	async activityById(@Args('id', { type: () => String }) id: string) {
		return this.activityService.getActivitiesById(id);
	}

	@Query(() => Activity)
	async activityByWikiIdAndBlock(@Args() args: ByIdAndBlockArgs) {
		return this.activityService.getActivitiesByWikiIdAndBlock(args);
	}

	@ResolveField(() => Author)
	async author(@Parent() wiki: IWiki) {
		const { id } = wiki;
		return this.activityService.resolveAuthor(id);
	}
}

export default ActivityResolver;
