import { Args, Context, Mutation, Resolver, Query } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import ContentFeebackService from './contentFeedback.service'
import { ContentFeedbackArgs, RatingArgs } from './contentFeedback.dto'
import Feedback, { RatingsCount } from '../../Database/Entities/feedback.entity'
import AuthGuard from '../utils/admin.guard'

@Resolver(() => Boolean)
class ContentFeedbackResolver {
  constructor(private contentFeebackService: ContentFeebackService) {}

  @Query(() => Feedback, { nullable: true })
  async ratingsByUser(@Args() args: RatingArgs) {
    return this.contentFeebackService.getRating(args.contentId, args.userId)
  }

  @Query(() => [RatingsCount], { nullable: true })
  @UseGuards(AuthGuard)
  async ratingsCount(
    @Args({ name: 'contendId', type: () => String, nullable: true })
    contentId?: string,
  ) {
    return this.contentFeebackService.ratingsCount(contentId)
  }

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
