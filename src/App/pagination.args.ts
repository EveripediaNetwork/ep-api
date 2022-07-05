import { ArgsType, Field, Int } from '@nestjs/graphql'
import { Min, Max } from 'class-validator'

@ArgsType()
class PaginationArgs {
  @Field(() => Int)
  offset = 0

  @Field(() => Int)
  @Min(1)
  @Max(50)
  limit = 30

  @Field(() => Boolean)
  hidden = false
}

export default PaginationArgs
