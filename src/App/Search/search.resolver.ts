// biome-ignore lint: Biome does not fully support TypeScript decorators in NestJS.
import { Args, Query, Resolver, Mutation } from '@nestjs/graphql'
import { BadRequestException, UseGuards } from '@nestjs/common'
import SearchService from './search.service'
import { SearchResult } from './search.types'
import AuthGuard from '../utils/admin.guard'

@Resolver(() => SearchResult)
class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => SearchResult)
  async search(
    @Args('query') query: string,
    @Args('withAnswer', { type: () => Boolean, defaultValue: true })
    withAnswer: boolean,
  ) {
    if (!query?.trim()) {
      throw new BadRequestException('Search query cannot be empty.')
    }
    return this.searchService.search(query, withAnswer)
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async clearLearnDocsCache() {
    return this.searchService.clearLearnDocsCache()
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async refreshLearnDocsCache() {
    return this.searchService.refreshLearnDocsCache()
  }
}

export default SearchResolver
