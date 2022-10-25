import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import SentryInterceptor from '../sentry/security.interceptor'
import Subscription from '../Database/Entities/subscription.entity'
import WikiSubscriptionService from './subscriptions.service'
import { WikiSubscriptionArgs } from '../Database/Entities/types/IWiki'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Subscription)
class WikiSubscriptionResolver {
  constructor(
    private connection: Connection,
    private wikiSubscriptionService: WikiSubscriptionService,
  ) {}

  @Query(() => [Subscription])
  async wikiSubscriptions(@Args('userId') userId: string) {
    const repository = this.connection.getRepository(Subscription)
    return repository.find({
      where: {
        userId,
      },
    })
  }

  @Mutation(() => Subscription)
  async addWikiSubscription(
    @Args() args: WikiSubscriptionArgs,
    @Context() context: any,
  ) {
    const { authorization } = context.req.headers
    return this.wikiSubscriptionService.addSub(args, authorization)
  }

  @Mutation(() => Boolean)
  async removeWikiSubscription(@Args() args: WikiSubscriptionArgs) {
    const repository = this.connection.getRepository(Subscription)
    repository
      .createQueryBuilder()
      .delete()
      .from(Subscription)
      .where(
        '"userId" = :id AND "notificationType" = :notificationType AND "auxiliaryId" = :auxiliaryId',
        {
          args,
        },
      )
      .execute()
    return true
  }
}

export default WikiSubscriptionResolver
