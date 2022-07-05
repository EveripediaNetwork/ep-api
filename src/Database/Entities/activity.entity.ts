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
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql'

import Wiki from './wiki.entity'
import User from './user.entity'

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

  @Field()
  @Column('boolean', { default: false })
  hidden!: boolean
}

export default Activity
