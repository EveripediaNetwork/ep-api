import { Args, Context, Query, Resolver } from '@nestjs/graphql'
import {
  CategoryArgs,
  CommonArgs,
  EventsArgs,
  EventsByBlockchainArgs,
  EventByCategoryArgs,
  EventByTitleArgs,
  LangArgs,
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
  async events(@Args() args: EventsArgs, @Context() context: any) {
    const { req } = context
    const { query } = req.body

    const events = await this.eventsService.events(
      [eventTag, ...(args.tagIds || [])],
      {
        limit: args.limit,
        offset: args.offset,
      },
      {
        start: args.startDate as string,
        end: args.endDate as string,
      },
    )

    return this.eventsService.resolveWikiRelations(events, query)
  }

  @Query(() => [Wiki])
  async wikiEventsByCategory(@Args() args: CommonArgs) {
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
  async popularEvents(@Args() args: LangArgs) {
    return this.wikiService.getPopularEvents(args)
  }

  @Query(() => [Wiki], { nullable: true })
  async eventsByBlockchain(
    @Args() args: EventByBlockchainArgs,
    @Context() context: any,
  ) {
    const { req } = context
    const { query } = req.body
    const events = await this.eventsService.getEventsByBlockchain(args)
    return this.eventsService.resolveWikiRelations(events, query)
  }
}

export default EventsResolver
