import { Field, ObjectType, ID } from '@nestjs/graphql'

@ObjectType()
export class WikiSuggestion {
  @Field(() => ID)
  id!: string

  @Field(() => String)
  title!: string

  @Field(() => Number)
  score!: number
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
