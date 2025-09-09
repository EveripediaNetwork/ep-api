import { Resolver, Query, Args, Mutation } from '@nestjs/graphql'
import { Draft } from '../../Database/Entities/draft.entity'
import { DraftService } from './draft.service'
import { CreateDraftInput, UpdateDraftInput } from './draft.input'

@Resolver(() => Draft)
export class DraftResolver {
  constructor(private readonly draftService: DraftService) {}

  @Query(() => [Draft])
  async drafts(
    @Args('id') id: string,
    @Args('title', { nullable: true }) title?: string,
  ): Promise<Draft[]> {
    return this.draftService.getDrafts(id, title)
  }

  @Mutation(() => Draft)
  async createDraft(@Args('input') input: CreateDraftInput): Promise<Draft> {
    return this.draftService.createDraft(input)
  }

  @Mutation(() => Draft)
  async updateDraft(@Args('input') input: UpdateDraftInput): Promise<Draft> {
    return this.draftService.updateDraft(input)
  }

  @Mutation(() => Boolean)
  async deleteDraft(
    @Args('id') id: string,
    @Args('title') title: string,
  ): Promise<boolean> {
    return this.draftService.deleteDraft(id, title)
  }
}
