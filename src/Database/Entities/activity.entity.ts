/* eslint-disable import/no-cycle */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
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
}

export default Activity
