import {
  Args,
  ArgsType,
  Context,
  Field,
  Mutation,
  Resolver,
} from '@nestjs/graphql'

import ContentFeebackService from './contentFeedback.service'

@ArgsType()
export class ContentFeedbackArgs {
  @Field(() => String, { nullable: true })
  wikiId?: string

  @Field(() => String, { nullable: true })
  userId?: string

  @Field(() => Boolean, { nullable: true })
  choice?: boolean
}

@ArgsType()
export class IQSocialFeedbackArgs {
  @Field(() => String, { nullable: true })
  reportType?: string

  @Field(() => String, { nullable: true })
  message?: string
}

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
