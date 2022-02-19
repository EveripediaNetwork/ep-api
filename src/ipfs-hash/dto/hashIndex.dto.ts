import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export default class HashIndex {
  @Field({ nullable: true })
  version?: number

  @Field({ nullable: true })
  ipfsHash?: string

  @Field()
  userId!: string

  @Field({ nullable: true })
  edited?: boolean
}
