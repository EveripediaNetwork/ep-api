/* eslint-disable import/no-cycle */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
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
  CREATED = '0',
  UPDATED = '1',
}

registerEnumType(Status, {
  name: 'Status',
})

@ObjectType()
@Entity()
@Index("idx_lower_activity_id", { synchronize: false })
class Activity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field(() => User)
  @ManyToOne('User', 'user', { eager: true })
  user!: User

  @Field(() => Wiki)
  @ManyToOne('Wiki', 'wiki', { lazy: true })
  @JoinColumn()
  wiki!: Wiki

  @Field()
  @Column('varchar')
  wikiId!: string

  @Field(() => Language)
  @Index('idx_activity_language')
  @ManyToOne('Language', 'language', { eager: true, nullable: true })
  language!: Language

  @Field(() => Int)
  @Column('integer', { nullable: true })
  block!: number

  @Field(() => Status)
  @Column('enum', { enum: Status })
  type!: Status

  @Field(() => [Wiki])
  @Column('jsonb')
  content!: Wiki[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  @Index('idx_activity_datetime')
  datetime!: Date

  @Field()
  @Column('varchar', { nullable: true })
  ipfs!: string
}

export default Activity
