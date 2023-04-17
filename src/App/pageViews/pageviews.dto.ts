import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class WikiViews {
  @Field(() => GraphQLISODateTime)
  day!: Date

  @Field(() => Int)
  visits!: number
}

export default WikiViews
