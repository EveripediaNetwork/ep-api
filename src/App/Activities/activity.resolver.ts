import { Args, Query, ResolveField, Resolver, Root } from '@nestjs/graphql'
import Activity from '../../Database/Entities/activity.entity'
import ActivityService from './activity.service'
import {
  ActivityArgs,
  ActivityArgsByUser,
  ActivityByCategoryArgs,
  ByIdAndBlockArgs,
} from './dto/activity.dto'
import { ArgsById } from '../utils/queryHelpers'
import User from '../../Database/Entities/user.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import SelectedFields from '../utils/getFields'

@Resolver(() => Activity)
class ActivityResolver {
  constructor(private activityService: ActivityService) {}

  @Query(() => [Activity])
  async activities(@Args() args: ActivityArgs) {
    return this.activityService.getActivities(args)
  }

  @Query(() => [Activity])
  async activitiesByWikId(@Args() args: ActivityArgs) {
    return this.activityService.getActivitiesByWikId(args)
  }

  @Query(() => [Activity])
  async activitiesByCategory(@Args() args: ActivityByCategoryArgs) {
    return this.activityService.getActivitiesByCategory(args)
  }

  @Query(() => [Activity])
  async activitiesByUser(
    @Args() args: ActivityArgsByUser,
    @SelectedFields({ nested: true, path: 'content' }) fields: string[],
  ) {
    return this.activityService.getActivitiesByUser(args, fields)
  }

  @Query(() => Activity)
  async activityById(@Args() args: ArgsById) {
    return this.activityService.getActivitiesById(args.id)
  }

  @Query(() => Activity)
  async activityByWikiIdAndBlock(@Args() args: ByIdAndBlockArgs) {
    return this.activityService.getActivitiesByWikiIdAndBlock(args)
  }

  @ResolveField(() => User, { name: 'user' })
  async forId(@Root() activity: Activity): Promise<User> {
    return { id: activity.userAddress } as User
  }

  @ResolveField(() => [Wiki])
  async content(@Root() activity: Activity) {
    const { content } = activity
    const updatedContent = content.map((wiki) => ({
      ...wiki,
      created: activity.created_timestamp,
      updated: activity.updated_timestamp,
    }))
    return updatedContent
  }
}

export default ActivityResolver
