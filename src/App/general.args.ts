import { ArgsType, Field, registerEnumType } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import { ValidStringParams } from './utils/customValidator'

export enum OrderBy {
  ID = 'id',
  VIEWS = 'views',
  BLOCK = 'block',
  CREATED = 'created',
  UPDATED = 'updated',
  DAY = 'day',
  DATE = 'date',
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
export class ArgsById {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string
}

registerEnumType(OrderBy, { name: 'OrderBy' })
registerEnumType(Direction, { name: 'Direction' })
registerEnumType(ActivityType, { name: 'ActivityType' })
registerEnumType(IntervalByDays, { name: 'IntervalByDays' })
