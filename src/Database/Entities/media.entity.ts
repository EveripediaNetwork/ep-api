/* eslint-disable import/no-cycle */
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Column } from 'typeorm'

export enum Source {
  IPFS_IMG,
  IPFS_VID,
  VIMEO,
  YOUTUBE,
}

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
}

export default Media
