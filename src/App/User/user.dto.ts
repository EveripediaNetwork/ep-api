import { ArgsType, Field } from '@nestjs/graphql'
import { Validate, MinLength } from 'class-validator'
import PaginationArgs from '../pagination.args'
import ValidStringParams from '../utils/customValidator'

@ArgsType()
export class UserStateArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string

  @Field(() => Boolean)
  active = true
}

@ArgsType()
export class UsersByIdArgs extends PaginationArgs {
  @Field(() => String)
  @MinLength(2)
  @Validate(ValidStringParams)
  id!: string
}

@ArgsType()
export class UsersByEditArgs extends PaginationArgs {
  @Field(() => Boolean, { nullable: true })
  edits!: boolean
}

@ArgsType()
export class GetProfileArgs {
  @Field({ nullable: true })
    @Validate(ValidStringParams)
  id?: string

  @Field({ nullable: true })
    @Validate(ValidStringParams)
  username?: string
}
