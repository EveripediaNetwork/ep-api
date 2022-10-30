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
} from 'typeorm'
import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql'

import Category from './category.entity'
import Tag from './tag.entity'
import User from './user.entity'
import Language from './language.entity'
import Metadata from './metadata.entity'
import Media from './media.entity'
import Image from './image.entity'
import { Author } from './types/IUser'
import { dateMiddleware, summaryMiddleware } from './middlewares/wikiMiddleware'

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
  hidden!: boolean

  @Field(() => GraphQLISODateTime, {
    middleware: [dateMiddleware],
    nullable: true,
  })
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime, {
    middleware: [dateMiddleware],
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

  @Field(() => Int)
  @Column('smallint', { default: 0 })
  promoted = 0

  @Field()
  @Column('text')
  content!: string

  @Field({ middleware: [summaryMiddleware] })
  @Column('varchar', { default: '' })
  summary!: string

  @Field(() => Language)
  @ManyToOne('Language', 'language', { lazy: true })
  language!: Language

  @Field(() => User)
  @ManyToOne('User', 'user', { lazy: true })
  user!: User

  @Field(() => Author, { nullable: true })
  author?: Author

  @Field(() => [Metadata])
  @Column('json', { nullable: true })
  metadata!: Metadata[]

  @Field(() => [Media], { nullable: true })
  @Column('json', { nullable: true })
  media?: Media[]

  @Field(() => [Image])
  @Column('json', { nullable: true, lazy: true })
  images!: Image[]

  @Field(() => [Tag])
  @ManyToMany(() => Tag, { lazy: true })
  @JoinTable()
  tags!: Tag[]

  @Field(() => [Category])
  @ManyToMany(() => Category, { lazy: true })
  @JoinTable()
  categories!: Category[]

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
