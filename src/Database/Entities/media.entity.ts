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

  @Field({ nullable: true })
  size?: string

  @Field({ nullable: true })
  name?: string

  @Field({ nullable: true })
  caption?: string

  @Field({ nullable: true })
  thumbnail?: string

  @Field(() => Source)
  @Column('enum', { enum: Source })
  source!: Source
}

export default Media
