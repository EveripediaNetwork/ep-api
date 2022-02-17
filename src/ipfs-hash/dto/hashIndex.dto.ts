import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export default class HashIndex {
  @Field()
  version!: number

  @Field()
  ipfsHash!: string

  @Field()
  userId!: string

  @Field()
  edited!: boolean
}
