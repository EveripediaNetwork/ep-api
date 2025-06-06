import {
  Args,
  Context,
  Query,
  ResolveField,
  Resolver,
  Root,
} from '@nestjs/graphql'
import Activity from '../../Database/Entities/activity.entity'
import {
  ActivityArgs,
  ActivityArgsByUser,
  ActivityByCategoryArgs,
  ByIdAndBlockArgs,
} from './dto/activity.dto'
import User from '../../Database/Entities/user.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import SelectedFields from '../utils/getFields'
import ActivityRepository from './activity.repository'
import {
  WikiStats,
  IntervalArgs,
  WikiUserStats,
  UserArgs,
  Count,
  DateArgs,
} from '../Wiki/wikiStats.dto'
import { ArgsById } from '../general.args'

@Resolver(() => Activity)
class ActivityResolver {
  constructor(private activityRepository: ActivityRepository) {}

  @Query(() => [Activity])
  async activities(
    @Args() args: ActivityArgs,
    @Context() context: any,
    @SelectedFields({ nested: true, path: 'content' }) fields: string[],
  ) {
    const { req } = context
    const { query } = req.body
    return this.activityRepository.getActivities(args, query, fields)
  }

  @Query(() => [Activity])
  async activitiesByWikId(
    @Args() args: ActivityArgs,
    @Context() context: any,
    @SelectedFields({ nested: true, path: 'content' }) fields: string[],
  ) {
    const { req } = context
    const { query } = req.body
    return this.activityRepository.getActivitiesByWikId(args, query, fields)
  }

  @Query(() => [Activity])
  async activitiesByCategory(@Args() args: ActivityByCategoryArgs) {
    return this.activityRepository.getActivitiesByCategory(args)
  }

  @Query(() => [Activity])
  async activitiesByUser(@Args() args: ActivityArgsByUser) {
    return this.activityRepository.getActivitiesByUser(args.userId)
  }

  @Query(() => Activity)
  async activityById(@Args() args: ArgsById) {
    return this.activityRepository.getActivitiesById(args.id)
  }

  @Query(() => Activity)
  async activityByWikiIdAndBlock(@Args() args: ByIdAndBlockArgs) {
    return this.activityRepository.getActivitiesByWikiIdAndBlock(args)
  }

  @Query(() => [WikiStats])
  async wikisCreated(@Args() args: IntervalArgs) {
    return this.activityRepository.queryWikisByActivityType(args)
  }

  @Query(() => [WikiStats])
  async wikisEdited(@Args() args: IntervalArgs) {
    return this.activityRepository.queryWikisByActivityType(args, 1)
  }

  @Query(() => WikiUserStats)
  async wikisCreatedByUser(@Args() args: UserArgs) {
    return this.activityRepository.getWikisCreatedByUser(args)
  }

  @Query(() => WikiUserStats)
  async wikisEditedByUser(@Args() args: UserArgs) {
    return this.activityRepository.getWikisCreatedByUser(args, 1)
  }

  @Query(() => Count)
  async editorCount(@Args() args: DateArgs) {
    return this.activityRepository.getEditorCount(args)
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
      hidden: wiki.hidden,
    }))
    return updatedContent
  }
}

export default ActivityResolver
