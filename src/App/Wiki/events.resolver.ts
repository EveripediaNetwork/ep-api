import { Args, Query, Resolver } from "@nestjs/graphql";
import WikiService from "./wiki.service";
import { LangArgs } from "./wiki.dto";
import Events from "../../Database/Entities/types/IEvents";

@Resolver("Event")
class EventsResolver {
  constructor (
    private readonly wikiService: WikiService
  ){}

  @Query(() => [Events], { nullable: true })
  async popularEvents(@Args() args: LangArgs): Promise<Events[]> {
    return this.wikiService.getPopularEvents(args)
  }
}

export default EventsResolver