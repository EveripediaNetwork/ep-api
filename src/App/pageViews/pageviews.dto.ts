import { ArgsType, Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql'
import { Min, Max } from 'class-validator'
import { OrderArgs } from '../pagination.args'

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
}

export default WikiViews
