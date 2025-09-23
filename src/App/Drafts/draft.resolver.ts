import { Resolver, Query, Args, Mutation } from '@nestjs/graphql'
import { Draft } from '../../Database/Entities/draft.entity'
import { DraftService } from './draft.service'
import { DraftInput } from './draft.input'

@Resolver(() => Draft)
export class DraftResolver {
  constructor(private readonly draftService: DraftService) {}

  @Query(() => [Draft])
  async drafts(
    @Args('userId') userId: string,
    @Args('title', { nullable: true }) title?: string,
  ): Promise<Draft[]> {
    return this.draftService.getDrafts(userId, title)
  }

  @Mutation(() => Draft)
  async createDraft(@Args('input') input: DraftInput): Promise<Draft> {
    return this.draftService.createDraft(input)
  }

  @Mutation(() => Boolean)
  async deleteDraft(
    @Args('userId') userId: string,
    @Args('title') title: string,
  ): Promise<boolean> {
    return this.draftService.deleteDraft(userId, title)
  }
}
