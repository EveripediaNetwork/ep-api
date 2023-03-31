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
import Metadata from './metadata.entity'
import Media from './types/IMedia'

export enum Status {
  CREATED,
  UPDATED,
}

registerEnumType(Status, {
  name: 'Status',
})

@ObjectType()
@Entity()
class NormalActivity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field(() => User)
  @ManyToOne('User', 'user', { lazy: true })
  @Index('idx_activity_userId')
  user!: Relation<User>

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

  @Field(() => Status)
  @Column('enum', { enum: Status })
  type!: Status

  @Field(() => [Wiki])
  @Column('jsonb')
  content!: Partial<Wiki>[]

  @Field()
  @Column('text')
  wikiContent!: string

  @Field(() => [Metadata])
  @Column('json')
  metadata!: Metadata[]

  @Field(() => [Media], { nullable: true })
  @Column('json')
  media?: Media[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  @Index('idx_activity_datetime')
  datetime!: Date

  @Field()
  @Column('varchar', { nullable: true })
  ipfs!: string
}

export default NormalActivity
