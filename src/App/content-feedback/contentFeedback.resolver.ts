import { UseInterceptors } from '@nestjs/common'
import { Args, ArgsType, Field, Mutation, Resolver } from '@nestjs/graphql'

import SentryInterceptor from '../../sentry/security.interceptor'
import ContentFeebackService from './contentFeedback.service'

@ArgsType()
class ContentFeedbackArgs {
  @Field(() => String)
  wikiId!: string

  @Field(() => String)
  userId!: string

  @Field(() => Boolean)
  choice!: boolean
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => Boolean)
class ContentFeedbackResolver {
  constructor(private contentFeebackService: ContentFeebackService) {}

  @Mutation(() => Boolean)
  async contentFeedback(@Args() args: ContentFeedbackArgs) {
    await this.contentFeebackService.postFeedback(args)
    return true
  }
}

export default ContentFeedbackResolver
