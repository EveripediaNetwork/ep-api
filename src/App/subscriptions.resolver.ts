import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import SentryInterceptor from '../sentry/security.interceptor'
import Subscription from '../Database/Entities/subscription.entity'
import WikiSubscriptionService from './subscriptions.service'
import { WikiSubscriptionArgs } from '../Database/Entities/types/IWiki'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Subscription)
class WikiSubscriptionResolver {
  constructor(
    private wikiSubscriptionService: WikiSubscriptionService,
  ) {}

  @Query(() => [Subscription])
  async wikiSubscriptions(
    @Context() context: any,
    @Args('userId') userId: string,
  ) {
    const { authorization } = context.req.headers
    return this.wikiSubscriptionService.getSubs(authorization, userId)
  }

  @Mutation(() => Subscription)
  async addWikiSubscription(
    @Context() context: any,
    @Args() args: WikiSubscriptionArgs,
  ) {
    const { authorization } = context.req.headers
    return this.wikiSubscriptionService.addSub(authorization, args)
  }

  @Mutation(() => Boolean)
  async removeWikiSubscription(
    @Context() context: any,
    @Args() args: WikiSubscriptionArgs,
  ) {
    const { authorization } = context.req.headers
    return this.wikiSubscriptionService.removeSub(authorization, args.userId, args)
    
  }
}

export default WikiSubscriptionResolver
