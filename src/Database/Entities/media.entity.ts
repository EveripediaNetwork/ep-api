/* eslint-disable import/no-cycle */
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'
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

registerEnumType(Format, {
  name: 'Format',
})

registerEnumType(Source, {
  name: 'Source',
})

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
  source!: Source

  @Field(() => Format)
  @Column('enum', { enum: Format })
  format!: Format
}

export default Media
