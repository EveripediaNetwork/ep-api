import { InputType, Field } from '@nestjs/graphql'
import { ValidStringParams } from '../utils/customValidator'
import { Validate } from 'class-validator'

@InputType()
export class DraftInput {
  @Field()
  @Validate(ValidStringParams)
  userId!: string

  @Field()
  @Validate(ValidStringParams)
  title!: string

  @Field(() => String)
  @Validate(ValidStringParams)
  wikiId!: string

  @Field(() => String)
  draft!: any
}
