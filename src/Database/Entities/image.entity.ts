import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
class Image {
  @Field()
  id!: string

  @Field()
  type!: string
}

export default Image