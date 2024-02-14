/* eslint-disable import/no-cycle */
import { Field, ObjectType } from '@nestjs/graphql'

type LinkedWikisType = string[]

@ObjectType()
class LinkedWikis {
  @Field(() => [String], { nullable: true })
  founders?: LinkedWikisType

  @Field(() => [String], { nullable: true })
  blockchains?: LinkedWikisType

  @Field(() => [String], { nullable: true})
  speakers?: LinkedWikisType
}

export default LinkedWikis
