import { Args, Context, Query, Resolver } from '@nestjs/graphql'
import {
  CategoryArgs,
  EventArgs,
  EventByCategoryArgs,
  EventByTitleArgs,
  EventDefaultArgs,
  TitleArgs,
  eventTag,
} from './wiki.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from './wiki.service'
import EventsService from './events.service'

@Resolver('Event')
class EventsResolver {
  constructor(
    private readonly wikiService: WikiService,
    private readonly eventsService: EventsService,
  ) {}

  @Query(() => [Wiki], { nullable: true })
  async events(@Args() args: EventArgs, @Context() context: any) {
    const { req } = context
    const { query } = req.body

    const events = await this.eventsService.events(
      [eventTag, ...(args.tagIds || [])],
      args,
    )
    const resolvedEvents = await this.eventsService.resolveWikiRelations(
      events,
      query,
    )
    return resolvedEvents
  }

  @Query(() => [Wiki])
  async wikiEventsByCategory(@Args() args: EventByCategoryArgs) {
    return this.wikiService.getWikisByCategory(
      { category: args.category } as CategoryArgs,
      args,
    )
  }

  @Query(() => [Wiki])
  async wikiEventsByTitle(@Args() args: EventByTitleArgs) {
    return this.wikiService.getWikisByTitle(
      { title: args.title } as TitleArgs,
      args,
    )
  }

  @Query(() => [Wiki], { nullable: true })
  async popularEvents(@Args() args: EventDefaultArgs) {
    return this.wikiService.getPopularEvents(args)
  }

}

export default EventsResolver
