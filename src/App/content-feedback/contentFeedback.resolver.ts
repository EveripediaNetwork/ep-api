import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'

import ContentFeebackService from './contentFeedback.service'
import { ContentFeedbackArgs } from './contentFeedback.dto'

@Resolver(() => Boolean)
class ContentFeedbackResolver {
  constructor(private contentFeebackService: ContentFeebackService) {}

  @Mutation(() => Boolean)
  async contentFeedback(
    @Context() ctx: any,
    @Args() args: ContentFeedbackArgs,
  ) {
    return this.contentFeebackService.postFeedback({
      ...args,
      ip: ctx.req.ip,
    })
  }
}

export default ContentFeedbackResolver
