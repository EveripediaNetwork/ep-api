/* eslint-disable max-classes-per-file */
import { ObjectType, Field, Int, ArgsType } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import { ValidStringParams } from '../utils/customValidator'

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
  startDate: number

  @Field(() => Int)
  endDate: number

  constructor() {
    const currentDate = new Date()
    this.startDate = Math.round(
      currentDate.setDate(new Date().getDate() - 7) / 1000,
    )
    this.endDate = Math.round(Date.now() / 1000)
  }
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
