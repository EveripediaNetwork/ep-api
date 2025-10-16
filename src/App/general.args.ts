import {
  ArgsType,
  Field,
  Int,
  PickType,
  registerEnumType,
} from '@nestjs/graphql'
import { Max, Min, Validate } from 'class-validator'
import { ValidStringParams } from './utils/customValidator'

export enum OrderBy {
  ID = 'id',
  VIEWS = 'views',
  BLOCK = 'block',
  CREATED = 'created',
  UPDATED = 'updated',
  DAY = 'day',
  DATE = 'date',
  TOKENS = 'tokens',
}

export enum ActivityType {
  CREATED = 0,
  UPDATED = 1,
}

export enum Direction {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum IntervalByDays {
  DAY = 1,
  WEEK = 7,
  MONTH = 30,
  NINETY_DAYS = 90,
  YEAR = 365,
}

@ArgsType()
export class BaseArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  lang = 'en'

  @Field(() => Direction)
  direction = Direction.DESC

  @Field(() => OrderBy)
  order = OrderBy.UPDATED

  @Field(() => Boolean)
  hidden = false

  @Field(() => Int)
  offset = 0

  @Field(() => Int)
  @Min(1)
  @Max(50)
  limit = 30
}

@ArgsType()
export class ArgsById extends PickType(BaseArgs, ['lang', 'offset', 'limit']) {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string
}

registerEnumType(OrderBy, { name: 'OrderBy' })
registerEnumType(Direction, { name: 'Direction' })
registerEnumType(ActivityType, { name: 'ActivityType' })
registerEnumType(IntervalByDays, { name: 'IntervalByDays' })
