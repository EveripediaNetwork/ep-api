/* eslint-disable import/no-cycle */
import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
class LinkedWikis {
  @Field({ nullable: true })
  founders?: string

  @Field({ nullable: true })
  blockchain?: string
}

export default LinkedWikis
