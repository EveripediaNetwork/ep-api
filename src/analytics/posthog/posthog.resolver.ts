import { Resolver, Mutation, Args } from '@nestjs/graphql'
import { PostHogService } from './posthog.service'
import { EventPropertiesInput } from './view-event.input'

@Resolver()
export class PosthogResolver {
  constructor(private readonly postHogService: PostHogService) {}

  @Mutation(() => Boolean)
  async viewEvent(
    @Args('event') event: string,
    @Args('distinctId') distinctId: string,
    @Args('properties', { type: () => EventPropertiesInput }) properties: EventPropertiesInput,
  ): Promise<boolean> {
    await this.postHogService.sendEvent(event, distinctId, properties)
    return true
  }
}
