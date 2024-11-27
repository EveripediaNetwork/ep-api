import { ArgsType, Field, Int } from '@nestjs/graphql'
import { Min, Max } from 'class-validator'
import { Direction, OrderBy } from './general.args'

@ArgsType()
class PaginationArgs {
  @Field(() => Int)
  offset = 0

  @Field(() => Int)
  @Min(1)
  @Max(50)
  limit = 30
}

@ArgsType()
export class OrderArgs extends PaginationArgs {
  @Field(() => Direction)
  direction = Direction.DESC

  @Field(() => OrderBy)
  order = OrderBy.UPDATED
}

@ArgsType()
export class HiIQHoldersRankArgs extends OrderArgs {
  @Field(() => Boolean)
  Raw = false
}

export default PaginationArgs
