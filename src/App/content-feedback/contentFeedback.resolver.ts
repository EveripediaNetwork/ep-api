import { UseInterceptors } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Context,
  Field,
  Mutation,
  Resolver,
} from '@nestjs/graphql'

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
  async contentFeedback(
    @Args() args: ContentFeedbackArgs,
    @Context() ctx: any,
  ) {
    return this.contentFeebackService.postFeedback(args, ctx.req.ip)
  }
}

export default ContentFeedbackResolver
