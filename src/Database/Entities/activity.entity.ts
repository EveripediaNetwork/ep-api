/* eslint-disable import/no-cycle */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm'

import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql'

import Wiki from './wiki.entity'
import User from './user.entity'
import Language from './language.entity'
import enumMiddleware from './middlewares/enumMiddleware'
import Tag from './tag.entity'
import Category from './category.entity'
import Metadata from './metadata.entity'
import Image from './image.entity'
import Media from './types/IMedia'

export enum Status {
  CREATED = 0,
  UPDATED = 1,
}

registerEnumType(Status, {
  name: 'Status',
})

@ObjectType()
@Entity()
class Activity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne('User', 'user', { lazy: true })
  @Index('idx_activity_userId')
  user!: Relation<User>

  @Field(() => User, { name: 'user' })
  forId!: Relation<User>

  @Column('varchar', { nullable: true })
  userAddress!: string

  @Field(() => String)
  @Column('varchar')
  wikiId!: string

  @Field(() => Language)
  @ManyToOne('Language', 'language', { lazy: true, nullable: true })
  @Index('idx_activity_languageId')
  language!: Relation<Language>

  @Field(() => Int)
  @Column('integer', { nullable: true })
  block!: number

  @Field(() => Status, {
    middleware: [enumMiddleware],
  })
  @Column('enum', { enum: Status })
  type!: Status

  @Field(() => [Wiki])
  @Column('jsonb')
  content!: Wiki[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  @Index('idx_activity_datetime')
  datetime!: Date

  @Field(() => GraphQLISODateTime, { nullable: true })
  @Column('timestamp without time zone', { nullable: true })
  created_timestamp!: Date

  @Field(() => GraphQLISODateTime, { nullable: true })
  @Column('timestamp without time zone', { nullable: true })
  updated_timestamp!: Date

  @Field()
  @Column('varchar', { nullable: true })
  ipfs!: string

  @Field(() => [Tag])
  @Column('json', { nullable: true })
  a_tags!: Tag[]

  @Field(() => [Category])
  @Column('json', { nullable: true })
  a_categories!: Category[]

  @Field(() => [Metadata])
  @Column('json', { nullable: true })
  a_metadata!: Metadata[]

  @Field(() => [Image])
  @Column('json', { nullable: true })
  a_images!: Image[]

  @Field(() => [Media])
  @Column('json', { nullable: true })
  a_media!: Media[]

  @Field()
  @Column({ nullable: true })
  a_transactionHash!: string

  @Field(() => Int)
  @Column('integer', { nullable: true })
  a_block!: number

  @Field()
  @Column('varchar', { default: '' })
  a_ipfs!: string

  @Field()
  @Column('varchar', { nullable: true })
  a_summary!: string

  @Field()
  @Column({ nullable: true })
  a_title!: string

  @Field()
  @Column('text', { nullable: true })
  a_content!: string

  @Field()
  @CreateDateColumn({ nullable: true })
  a_created!: Date

  @Field()
  @UpdateDateColumn({ nullable: true })
  a_updated!: Date

  @Field(() => User, { nullable: true })
  @Column('varchar', { nullable: true })
  a_author!: Relation<User>

  @Field()
  @Column('smallint', { nullable: true })
  a_version!: string
}

export default Activity