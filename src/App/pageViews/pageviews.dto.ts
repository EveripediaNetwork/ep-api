import {
  ArgsType,
  Field,
  GraphQLISODateTime,
  Int,
  ObjectType,
} from '@nestjs/graphql'
import { Min, Max, Validate } from 'class-validator'
import { OrderArgs } from '../pagination.args'
import ValidStringParams from '../utils/customValidator'
import { OrderBy, IntervalByDays } from '../general.args'

@ObjectType()
export class WikiViews {
  @Field(() => GraphQLISODateTime)
  day!: Date

  @Field(() => Int)
  visits!: number
}

@ArgsType()
export class WikiViewArgs extends OrderArgs {
  @Field(() => Int)
  @Min(7)
  @Max(365)
  days = 365

  @Field(() => OrderBy)
  order = OrderBy.DAY
}

@ArgsType()
export class VistArgs {
  @Field(() => IntervalByDays, { nullable: true })
  interval = IntervalByDays.WEEK
}

@ArgsType()
export class PageViewArgs extends VistArgs {
  @Field(() => Int)
  amount!: number

  @Field(() => String, { description: 'Format <YYYY/MM/DD>', nullable: true })
  @Validate(ValidStringParams)
  startDay?: string

  @Field(() => String, { description: 'Format <YYYY/MM/DD>', nullable: true })
  @Validate(ValidStringParams)
  endDay?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  category?: string
}

export default WikiViews
