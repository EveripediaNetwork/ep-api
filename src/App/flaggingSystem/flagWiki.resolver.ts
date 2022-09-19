import { UseInterceptors } from '@nestjs/common'
import { Mutation, Resolver } from '@nestjs/graphql'

import SentryInterceptor from '../../sentry/security.interceptor'
import FlagWikiService from './flagWiki.service'


@UseInterceptors(SentryInterceptor)
@Resolver(() => Boolean)
class FlagWikiResolver {
  constructor(private flagWikiService: FlagWikiService) {}

  @Mutation(() => Boolean)
  async flagWiki() {
    await this.flagWikiService.flagWiki()
    return true
  }
}

export default FlagWikiResolver
