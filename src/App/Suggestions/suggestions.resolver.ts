import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import UserSuggestion from '../../Database/Entities/userSuggestion.entity'
import SuggestionsService from './suggestions.service'
import { CreateSuggestionInput, GetSuggestionsArgs } from './suggestions.dto'

@Resolver(() => UserSuggestion)
export default class SuggestionsResolver {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Mutation(() => UserSuggestion)
  async createSuggestion(@Args('input') input: CreateSuggestionInput) {
    return this.suggestionsService.createSuggestion(input)
  }

  @Query(() => [UserSuggestion])
  async suggestions(@Args() args: GetSuggestionsArgs) {
    return this.suggestionsService.getSuggestions(args)
  }
}
