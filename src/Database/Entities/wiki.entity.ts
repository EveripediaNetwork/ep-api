import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql'
import Category from './category.entity'
import Tag from './tag.entity'
import User from './user.entity'
import Language from './language.entity'

@ObjectType()
class Metadata {
  @Field()
  id!: string

  @Field()
  value!: string
}

@ObjectType()
class Image {
  @Field()
  id!: string

  @Field()
  type!: string
}

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

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date

  @Field(() => Int)
  @Column('integer')
  views = 0

  @Field(() => Int)
  @Column('smallint')
  version = 1

  @Field()
  @Column('text')
  content!: string

  @Field(() => Language)
  @ManyToOne(() => Language, language => language.wikis, { lazy: true })
  language!: Language

  @Field(() => User)
  @ManyToOne(() => User, user => user.wikis, { lazy: true })
  user!: User

  @Field(() => [Metadata])
  @Column('json', { nullable: true })
  metadata!: Metadata[]

  @Field(() => [Image])
  @Column('json', { nullable: true })
  images!: Image[]

  @Field(() => [Tag])
  @ManyToMany(() => Tag, { lazy: true })
  @JoinTable()
  tags!: Tag[]

  @Field(() => [Category])
  @ManyToMany(() => Category, { lazy: true })
  @JoinTable()
  categories!: Category[]
}

export default Wiki
