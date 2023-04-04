import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'

import ContentFeebackService from './contentFeedback.service'
import {
  ContentFeedbackArgs,
  IQSocialFeedbackArgs,
} from './contentFeedback.dto'

@Resolver(() => Boolean)
class ContentFeedbackResolver {
  constructor(private contentFeebackService: ContentFeebackService) {}

  @Mutation(() => Boolean)
  async contentFeedback(
    @Context() ctx: any,
    @Args({ nullable: true }) iqwikiArgs?: ContentFeedbackArgs,
    @Args({ nullable: true }) iqSocialArgs?: IQSocialFeedbackArgs,
  ) {
    let state

    if (iqSocialArgs) {
      state = this.contentFeebackService.postSocialFeedback(iqSocialArgs)
    }
    if (iqwikiArgs) {
      state = this.contentFeebackService.postWikiFeedback(
        iqwikiArgs,
        ctx.req.ip,
      )
    }

    return state
  }
}

export default ContentFeedbackResolver
