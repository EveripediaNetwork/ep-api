import { ArgsType, Field } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import PaginationArgs from '../pagination.args'
import ValidStringParams from '../utils/customValidator'

@ArgsType()
class TagIDArgs extends PaginationArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string
}

export default TagIDArgs
