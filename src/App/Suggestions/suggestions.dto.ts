import { Field, InputType, ArgsType, Int } from '@nestjs/graphql'
import PaginationArgs from '../pagination.args'
import { IsEmail, IsNumber, Validate } from 'class-validator'
import { ValidStringParams } from '../utils/customValidator'

@InputType()
export class CreateSuggestionInput {
  @Field()
  @Validate(ValidStringParams)
  name!: string

  @Field(() => String, { nullable: true })
  suggestion!: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  wikiId?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  wikiTitle?: string

  @IsEmail()
  @Field(() => String, { nullable: true })
  email?: string

  @IsNumber()
  @Field(() => Int)
  relevance!: number

  @IsNumber()
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
