import { Args, Query, Resolver } from '@nestjs/graphql'
import Activity from '../../Database/Entities/activity.entity'
import Tag from '../../Database/Entities/tag.entity'
import { CategoryArgs } from '../Wiki/wiki.dto'
import {
  WikiStats,
  WikiUserStats,
  Count,
  IntervalArgs,
  UserArgs,
  DateArgs,
} from './wikiStats.dto'
import WikiStatService from './wikiStats.service'

@Resolver(() => Activity)
class WikiStatsResolver {
  constructor(private service: WikiStatService) {}

  @Query(() => [WikiStats])
  async wikisCreated(@Args() args: IntervalArgs) {
    return this.service.queryWikisByActivityType(args)
  }

  @Query(() => [WikiStats])
  async wikisEdited(@Args() args: IntervalArgs) {
    return this.service.queryWikisByActivityType(args, 1)
  }

  @Query(() => WikiUserStats)
  async wikisCreatedByUser(@Args() args: UserArgs) {
    return this.service.getWikisCreatedByUser(args)
  }

  @Query(() => WikiUserStats)
  async wikisEditedByUser(@Args() args: UserArgs) {
    return this.service.getWikisCreatedByUser(args, 1)
  }

  @Query(() => Count)
  async editorCount(@Args() args: DateArgs) {
    return this.service.getEditorCount(args)
  }

  @Query(() => Count)
  async pageViewsCount(@Args() args: DateArgs) {
    return this.service.getPageViewsCount(args)
  }

  @Query(() => [Tag])
  async tagsPopular(@Args() args: DateArgs) {
    return this.service.getTagsPopular(args)
  }

  @Query(() => Count)
  async categoryTotal(@Args() args: CategoryArgs) {
    return this.service.getCategoryTotal(args)
  }
}

export default WikiStatsResolver
