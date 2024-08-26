/* eslint-disable import/no-cycle */
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql'
import { EventType } from '@everipedia/iq-utils'
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import Wiki from './wiki.entity'

registerEnumType(EventType, { name: 'EventType' })

@ObjectType()
@Entity()
class Events {
  @Field(() => ID, { nullable: true })
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('varchar', { nullable: true })
  wikiId?: string

  @Field({ nullable: true })
  @Column('varchar', { nullable: true })
  title?: string

  @Field(() => EventType, { nullable: true })
  @Column('enum', { enum: EventType, nullable: true })
  type?: EventType

  @Field(() => String, { nullable: true })
  @Column('varchar', { nullable: true })
  date?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', { nullable: true })
  multiDateStart?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', { nullable: true })
  multiDateEnd?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', { nullable: true })
  description?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', { nullable: true })
  link?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', { nullable: true })
  continent?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', { nullable: true })
  country?: string

  @Field(() => Wiki, { nullable: true })
  @ManyToOne(() => Wiki, wiki => wiki.wikiEvents, { lazy: true })
  wiki!: Relation<Wiki>

  @Field(() => String, { nullable: true })
  action?: string
}

export default Events
