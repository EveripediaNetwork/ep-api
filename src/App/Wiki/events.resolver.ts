import { Args, Query, Resolver } from '@nestjs/graphql'
import { CategoryArgs, EventArgs, TitleArgs, eventTag } from './wiki.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import TagService from '../Tag/tag.service'
import WikiService from './wiki.service'

@Resolver('Event')
class EventsResolver {
  constructor(
    private readonly wikiService: WikiService,
    private readonly tagService: TagService,
  ) {}

  @Query(() => [Wiki], { nullable: true })
  async events(@Args() args: EventArgs) {
    const events = await this.tagService.wikis(
      [eventTag, ...(args.ids || [])],
      {
        limit: args.limit,
        offset: args.offset,
      },
      {
        start: args.startDate as string,
        end: args.endDate as string,
      },
    )
    return events
  }

  @Query(() => [Wiki])
  async wikiEventsByCategory(@Args() args: EventArgs) {
    return this.wikiService.getWikisByCategory(
      { category: args.categoryId } as CategoryArgs,
      args,
    )
  }

  @Query(() => [Wiki])
  async wikiEventsByTitle(@Args() args: EventArgs) {
    return this.wikiService.getWikisByTitle(
      { title: args.title } as TitleArgs,
      args,
    )
  }

  // @Query(() => [Wiki], { nullable: true })
  // async popularEvents(@Args() args: LangArgs): Promise<Wiki[]> {
  //   return this.wikiService.getPopularEvents(args)
  // }
}

export default EventsResolver
