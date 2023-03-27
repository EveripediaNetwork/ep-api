import { UseInterceptors } from '@nestjs/common'
import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import WikiSubscriptionService from './subscriptions.service'
import { WikiSubscriptionArgs } from '../Database/Entities/types/IWiki'
import IqSubscription from '../Database/Entities/IqSubscription'
import Wiki from '../Database/Entities/wiki.entity'

@Resolver(() => IqSubscription)
class WikiSubscriptionResolver {
  constructor(
    private dataSource: DataSource,
    private wikiSubscriptionService: WikiSubscriptionService,
  ) {}

  @Query(() => [IqSubscription])
  async wikiSubscriptions(
    @Context() context: any,
    @Args('userId') userId: string,
  ) {
    const { authorization } = context.req.headers
    return this.wikiSubscriptionService.getSubs(authorization, userId)
  }

  @Mutation(() => IqSubscription)
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

  @ResolveField(() => Wiki)
  async wiki(@Parent() wiki: WikiSubscriptionArgs) {
    const { auxiliaryId } = wiki
    const repository = this.dataSource.getRepository(Wiki)
    return repository.findOneBy({ id: auxiliaryId })
  }
}

export default WikiSubscriptionResolver
