import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  JoinTable,
} from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'
import Category from './category.entity'
import Tag from './tag.entity'
import User from './user.entity'
import Language from './language.entity'

type Metadata = {
  id: string
  value: string
}

type Image = {
  id: string
  type: string
}

@ObjectType()
@Entity()
class Wiki {
  @Field(type => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field()
  @Column()
  title!: string

  @Field()
  @Column()
  createdAt!: number

  @Column()
  lastModified!: number

  @Column('smallint')
  version = 1

  @Column('text')
  content!: string

  @ManyToOne(() => Language, language => language.wikis)
  language!: Language

  @ManyToOne(() => User, user => user.wikis)
  user!: User

  @Column('json', { nullable: true })
  metadata!: Metadata[]

  @Column('json', { nullable: true })
  images!: Image[]

  @ManyToMany(() => Tag)
  @JoinTable()
  tags!: Tag[]

  @ManyToMany(() => Category)
  @JoinTable()
  categories!: Category[]
}

export default Wiki
