/* eslint-disable max-classes-per-file */
import { ObjectType, Field, Int, ArgsType } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import ValidStringParams from '../utils/customValidator'

@ObjectType()
export class Count {
  @Field(() => Int)
  amount!: number
}

@ObjectType()
export class WikiStats extends Count {
  @Field()
  startOn!: Date

  @Field()
  endOn!: Date
}

@ObjectType()
export class WikiUserStats extends Count {
  @Field()
  @Validate(ValidStringParams)
  address!: string
}

@ArgsType()
export class DateArgs {
  @Field(() => Int)
  startDate = Math.round(new Date().setDate(new Date().getDate() - 7) / 1000)

  @Field(() => Int)
  endDate = Math.round(Date.now() / 1000)
}

@ArgsType()
export class IntervalArgs extends DateArgs {
  @Field(() => String)
  interval = 'hour'
}

@ArgsType()
export class UserArgs extends DateArgs {
  @Field(() => String)
  userId!: string
}
