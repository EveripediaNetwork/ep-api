import { Field, ObjectType, ID } from '@nestjs/graphql'

@ObjectType()
class WikiMetadata {
  @Field(() => String)
  url!: string

  @Field(() => String)
  title!: string
}

@ObjectType()
export class WikiSuggestion {
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
export class WikiContent {
  @Field(() => ID)
  id!: string

  @Field(() => String)
  title!: string

  @Field(() => String)
  content!: string
}

@ObjectType()
export class SearchResult {
  @Field(() => [WikiSuggestion], { nullable: true })
  suggestions?: WikiSuggestion[]

  @Field(() => [WikiContent], { nullable: true })
  wikiContents?: WikiContent[]

  @Field(() => String, { nullable: true })
  answer?: string
}
