// biome-ignore lint: Biome does not fully support TypeScript decorators in NestJS.
import { Args, Query, Resolver } from '@nestjs/graphql'
import { BadRequestException } from '@nestjs/common'
import SearchService from './search.service'
import { SearchResult } from './search.types'

@Resolver(() => SearchResult)
class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

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
}

export default SearchResolver
