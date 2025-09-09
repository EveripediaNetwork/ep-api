// biome-ignore lint: Biome does not fully support TypeScript decorators in NestJS.
import { Args, Query, Resolver, Mutation } from '@nestjs/graphql'
import { BadRequestException, UseGuards } from '@nestjs/common'
import SearchService from './search.service'
import { SearchResult } from './search.types'
import AuthGuard from '../utils/admin.guard'
import SearchEvaluator from './search-evaluator.service'
import EvaluationResult from './evaluator.types'

@Resolver(() => SearchResult)
class SearchResolver {
  constructor(
    private readonly searchService: SearchService,
    private readonly evaluatorService: SearchEvaluator,
  ) {}

  @Query(() => SearchResult)
  async search(
    @Args('query') query: string,
    @Args('withAnswer', { type: () => Boolean, defaultValue: true })
    withAnswer: boolean,
  ): Promise<SearchResult> {
    if (!query?.trim()) {
      throw new BadRequestException('Search query cannot be empty.')
    }
    return this.searchService.search(query, withAnswer)
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async clearLearnDocsCache(): Promise<boolean> {
    return this.searchService.clearLearnDocsCache()
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async refreshLearnDocsCache(): Promise<boolean> {
    return this.searchService.refreshLearnDocsCache()
  }

  @Query(() => EvaluationResult)
  async evaluator(@Args('query') query: string): Promise<EvaluationResult> {
    if (!query?.trim()) {
      throw new BadRequestException('Evaluation query cannot be empty.')
    }

    const { evaluation } = await this.evaluatorService.judge(query)
    return evaluation
  }
}

export default SearchResolver
