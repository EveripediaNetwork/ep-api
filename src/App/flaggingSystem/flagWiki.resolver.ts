import { UseInterceptors } from '@nestjs/common'
import { Args, ArgsType, Field, Mutation, Resolver } from '@nestjs/graphql'
import { Validate } from 'class-validator'

import SentryInterceptor from '../../sentry/security.interceptor'
import ValidStringParams from '../utils/customValidator'
import FlagWikiService from './flagWiki.service'

@ArgsType()
class FlagWikiArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  report!: string

  @Field(() => String)
  @Validate(ValidStringParams)
  wikiId!: string

  @Validate(ValidStringParams)
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
