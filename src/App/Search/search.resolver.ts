import { Args, Query, Resolver, Field, ObjectType, ID } from '@nestjs/graphql'
import { BadRequestException } from '@nestjs/common'
import SearchService from './search.service'

@ObjectType()
class WikiMetadata {
  @Field(() => String)
  url!: string

  @Field(() => String)
  title!: string
}

@ObjectType()
class WikiSuggestion {
  @Field(() => ID)
  id!: string

  @Field(() => String)
  title!: string

  @Field(() => Number)
  score!: number

  @Field(() => [WikiMetadata], { nullable: true })
  metadata?: WikiMetadata[]
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
    if (!query?.trim()) {
      throw new BadRequestException('Search query cannot be empty.')
    }
    return this.searchService.search(query)
  }
}

export default SearchResolver
