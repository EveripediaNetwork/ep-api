/* eslint-disable import/no-cycle */
import { MediaSource, MediaType } from '@everipedia/iq-utils'
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Column } from 'typeorm'

registerEnumType(MediaSource, { name: 'MediaSource' })
registerEnumType(MediaType, { name: 'MediaType' })

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

  @Field(() => MediaType)
  @Column('enum', { enum: MediaType })
  type?: MediaType

  @Field(() => MediaSource)
  @Column('enum', { enum: MediaSource })
  source!: MediaSource
}

export default Media
