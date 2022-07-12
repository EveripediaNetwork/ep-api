/* eslint-disable import/no-cycle */
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
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

export enum Status {
  CREATED,
  UPDATED,
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

  @Field(() => User)
  @ManyToOne('User', 'user', { lazy: true })
  user!: User

  @Field()
  @Column('varchar')
  wikiId!: string

  @Field(() => Language)
  @ManyToOne('Language', 'language', { lazy: true })
  language!: Language

  @Field(() => Int)
  @Column('integer')
  block!: number

  @Field(() => Status)
  @Column('enum', { enum: Status })
  type!: Status

  @Field(() => [Wiki])
  @Column('jsonb')
  content!: Wiki[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  datetime!: Date

  @Field()
  @Column('varchar', { nullable: true })
  ipfs!: string
}

export default Activity
