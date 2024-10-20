import { Args, Query, Resolver } from '@nestjs/graphql'
import { EventDefaultArgs } from './wiki.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from './wiki.service'

@Resolver('Event')
class EventsResolver {
  constructor(private readonly wikiService: WikiService) {}

  @Query(() => [Wiki], { nullable: true })
  async popularEvents(@Args() args: EventDefaultArgs) {
    return this.wikiService.getPopularEvents(args)
  }
}

export default EventsResolver
