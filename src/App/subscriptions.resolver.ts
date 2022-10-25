import { UseInterceptors } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Context,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import SentryInterceptor from '../sentry/security.interceptor'
import Subscription from '../Database/Entities/subscription.entity'
import WikiSubscriptionService from './subscriptions.service'

@InputType()
class SubscriptionArgs {
  @Field(() => String)
  id!: string

  @Field(() => String)
  type!: string
}

@ArgsType()
class WikiSubscriptionArgs {
  @Field(() => String)
  userId!: string

  @Field(() => [SubscriptionArgs])
  subscription!: SubscriptionArgs[]
}

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
        id: userId,
      },
    })
  }

  @Mutation(() => Subscription)
  async addWikiSubscription(
    @Args() args: WikiSubscriptionArgs,
    @Context() context: any,
  ) {
    const { authorization } = context.req.headers
    return this.wikiSubscriptionService.addSub(
      args.userId,
      args.subscription,
      authorization,
    )
  }

  @Mutation(() => Boolean)
  async removeWikiSubscription(@Args() args: WikiSubscriptionArgs) {
    const repository = this.connection.getRepository(Subscription)
    repository
      .createQueryBuilder()
      .delete()
      .from(Subscription)
      .where('"userId" = :id AND subscriptionId = :wikiId', {
        userId: args.userId,
        subscription: [],
      })
      .execute()
    return true
  }
}

export default WikiSubscriptionResolver
