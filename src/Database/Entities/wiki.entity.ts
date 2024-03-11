/* eslint-disable import/no-cycle */
import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
  AfterInsert,
  AfterUpdate,
  Index,
  Relation,
} from 'typeorm'
import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql'

import Category from './category.entity'
import Tag from './tag.entity'
import User from './user.entity'
import Language from './language.entity'
import Metadata from './metadata.entity'
import Media from './types/IMedia'
import Image from './image.entity'
import LinkedWikis from './types/ILinkedWikis'
import Events from './types/IEvents'

@ObjectType()
@Entity()
class Wiki {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field()
  @Column()
  title!: string

  @Field()
  @Column('boolean', { default: false })
  @Index('idx_wiki_hidden')
  hidden!: boolean

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  @UpdateDateColumn()
  updated!: Date

  @Field(() => Int)
  @Column('integer')
  block!: number

  @Field()
  @Column()
  transactionHash!: string

  @Field()
  @Column('varchar', { default: '' })
  ipfs!: string

  @Field(() => Int)
  @Column('smallint')
  version = 1

  @Field(() => Int, { nullable: true })
  @Column('integer', { default: 0 })
  views!: number

  @Field(() => Int, {
    nullable: true,
    defaultValue: 0,
  })
  visits?: number

  @Field(() => [Wiki], { nullable: true })
  founderWikis?: Wiki[]

  @Field(() => [Wiki], { nullable: true })
  speakerWikis?: Wiki[]

  @Field(() => [Wiki], { nullable: true })
  blockchainWikis?: Wiki[]

  @Field(() => Int)
  @Column('smallint', { default: 0 })
  promoted = 0

  @Field()
  @Column('text')
  content!: string

  @Field()
  @Column('varchar')
  summary!: string

  @Field(() => Language)
  @ManyToOne('Language', 'language', { lazy: true })
  language!: Relation<Language>

  @Field(() => User)
  @ManyToOne('User', 'user', { lazy: true })
  user!: Relation<User>

  @Field(() => User, { nullable: true })
  @ManyToOne('User', 'user', { lazy: true })
  author?: Relation<User>

  @Field(() => [Metadata])
  @Column('json', { nullable: true })
  metadata!: Metadata[]

  @Field(() => [Media], { nullable: true })
  @Column('json', { nullable: true })
  media?: Media[]

  @Field(() => LinkedWikis, { nullable: true })
  @Column('json', { nullable: true })
  linkedWikis?: LinkedWikis

  @Field(() => [Events], { nullable: true })
  @Column('json', { nullable: true })
  events?: Events[]

  @Field(() => [Image])
  @Column('json', { nullable: true })
  images!: Image[]

  @Field(() => [Tag])
  @ManyToMany(() => Tag, { lazy: true })
  @JoinTable()
  tags!: Relation<Tag>[]

  @Field(() => [Category])
  @ManyToMany(() => Category, { lazy: true })
  @JoinTable()
  categories!: Relation<Category>[]

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  async nullField() {
    if (!this.media) {
      this.media = []
    }
  }
}

export default Wiki
