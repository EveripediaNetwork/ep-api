import { ArgsType, Field, Int } from '@nestjs/graphql'
import { Min, Max } from 'class-validator'
import { Direction, OrderBy } from './general.args'

@ArgsType()
class PaginationArgs {
  @Field(() => Int)
  offset = 0

  @Field(() => Int)
  @Min(1)
  @Max(5000)
  limit = 30
}

@ArgsType()
export class OrderArgs extends PaginationArgs {
  @Field(() => Direction)
  direction = Direction.DESC

  @Field(() => OrderBy)
  order = OrderBy.UPDATED
}

export default PaginationArgs
