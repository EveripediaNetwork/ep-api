import { UseInterceptors } from '@nestjs/common'
import { Args, ArgsType, Field, Mutation, Resolver } from '@nestjs/graphql'

import SentryInterceptor from '../../sentry/security.interceptor'
import FlagWikiService from './flagWiki.service'

@ArgsType()
class FlagWikiArgs {
  @Field(() => String)
  report!: string

  @Field(() => String)
  wikiId!: string

  @Field(() => String)
  userId!: string
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => Boolean)
class FlagWikiResolver {
  constructor(private flagWikiService: FlagWikiService) {}

  @Mutation(() => Boolean)
  async flagWiki(@Args() args: FlagWikiArgs) {
    await this.flagWikiService.flagWiki(args)
    return true
  }
}

export default FlagWikiResolver
