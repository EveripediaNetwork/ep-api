import { Field, ObjectType } from '@nestjs/graphql'

export enum Format {
  IMAGE,
  VIDEO,
}

@ObjectType()
class Media {
  @Field()
  id!: string

  @Field()
  size!: string

  @Field()
  name!: string

  @Field()
  caption?: string

  @Field()
  ipfs!: string

  @Field(() => Format)
  @Column('enum', { enum: Format })
  type!: Format

  @Field()
  progress!: string
}

export default Media
