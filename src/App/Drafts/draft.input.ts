import { InputType, Field } from '@nestjs/graphql'
import { ValidStringParams } from '../utils/customValidator'
import { Validate } from 'class-validator'

@InputType()
export class DraftInput {
  @Field()
  @Validate(ValidStringParams)
  id!: string

  @Field()
  @Validate(ValidStringParams)
  title!: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  wikiId?: string

  @Field(() => String)
  draft!: any
}
