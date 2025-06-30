import { Args, Query, Resolver, Field, ObjectType } from '@nestjs/graphql'
import SearchService from './search.service'

@ObjectType()
class WikiSuggestion {
  @Field(() => String)
  id!: string

  @Field(() => String)
  title!: string
}

@ObjectType()
class SearchResult {
  @Field(() => [WikiSuggestion], { nullable: true })
  suggestions?: WikiSuggestion[]

  @Field(() => String, { nullable: true })
  answer?: string
}

@Resolver(() => SearchResult)
class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => SearchResult)
  async search(@Args('query') query: string): Promise<SearchResult> {
    return this.searchService.search(query)
  }
}

export default SearchResolver
