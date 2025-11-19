import { Field, InputType, ArgsType, Int } from '@nestjs/graphql'
import PaginationArgs from '../pagination.args'
import { IsEmail } from 'class-validator'

@InputType()
export class CreateSuggestionInput {
  @Field()
  name!: string

  @Field(() => String, { nullable: true })
  suggestion!: string

  @Field(() => String, { nullable: true })
  wikiId?: string

  @Field(() => String, { nullable: true })
  wikiTitle?: string

  @IsEmail()
  @Field(() => String, { nullable: true })
  email?: string

  @Field(() => Int)
  relevance!: number

  @Field(() => Int)
  cryptoScore!: number
}

@ArgsType()
export class GetSuggestionsArgs extends PaginationArgs {
  @Field({ nullable: true })
  wikiId?: string

  @Field({ nullable: true })
  name?: string
}
