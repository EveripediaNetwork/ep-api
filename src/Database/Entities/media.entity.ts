import { Field, ObjectType } from '@nestjs/graphql'
import { Column } from 'typeorm'

export enum Format {
  IMAGE,
  VIDEO,
}

export enum Source {
  IPFS,
  VIMEO,
  YOUTUBE,
}

@ObjectType()
class Media {
  @Field()
  id!: string

  @Field()
  size?: string

  @Field()
  name?: string

  @Field()
  caption?: string

  @Field()
  thumbnail?: string

  @Field(() => Source)
  @Column('enum', { enum: Source })
  type!: Source

  @Field(() => Format)
  @Column('enum', { enum: Format })
  format!: Format
}

export default Media
