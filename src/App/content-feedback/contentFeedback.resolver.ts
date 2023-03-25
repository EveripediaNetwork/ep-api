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
  @Field(() => String)
  wikiId!: string

  @Field(() => String, { nullable: true })
  userId?: string

  @Field(() => Boolean)
  choice!: boolean
}

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
