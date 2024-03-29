import { ArgsType, Field, Int } from '@nestjs/graphql'
import { Min, Max } from 'class-validator'
import PaginationArgs from '../pagination.args'
import { IntervalByDays } from '../general.args'

@ArgsType()
export default class HiIQHolderArgs extends PaginationArgs {
  @Field(() => IntervalByDays)
  interval = IntervalByDays.DAY

  @Field(() => Int)
  @Min(1)
  @Max(365)
  limit = 182
}
