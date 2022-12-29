/* eslint-disable import/no-cycle */
import { Field, ObjectType } from '@nestjs/graphql'

type LinkedWikisType = string[]
@ObjectType()
class LinkedWikis {
  @Field(() => [String], { nullable: true })
  founders?: LinkedWikisType

  @Field(() => [String], { nullable: true })
  blockchain?: LinkedWikisType
}

export default LinkedWikis
