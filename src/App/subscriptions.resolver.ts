import { UseInterceptors } from '@nestjs/common'
import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  ResolveField,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import SentryInterceptor from '../sentry/security.interceptor'
import Subscription from '../Database/Entities/subscription.entity'
import WikiSubscriptionService from './subscriptions.service'
import { WikiSubscriptionArgs } from '../Database/Entities/types/IWiki'
// import Wiki from '../Database/Entities/wiki.entity'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Subscription)
class WikiSubscriptionResolver {
  constructor(
    private connection: Connection,
    private wikiSubscriptionService: WikiSubscriptionService,
  ) {}

  @Query(() => [Subscription])
  async wikiSubscriptions(
    @Context() context: any,
    @Args() args: WikiSubscriptionArgs,
  ) {
    const { authorization } = context.req.headers
    return this.wikiSubscriptionService.getSubs(authorization, args.userId)
  }

  @ResolveField()
  async sam() {
    return 1
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
    return this.wikiSubscriptionService.removeSub(
      authorization,
      args.userId,
      args,
    )
  }
}

export default WikiSubscriptionResolver
