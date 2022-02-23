import { Column, Entity, ManyToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import Wiki from './wiki.entity'

@ObjectType()
@Entity()
class Category {
  @Field(type => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(type => String)
  @Column('varchar')
  title = ''

  @Field(type => String)
  @Column('text')
  description = ''

  @Field(type => String)
  @Column('varchar')
  cardImage = '' // TODO: get defaults for hero card and icon

  @Field(type => String)
  @Column('varchar')
  heroImage = ''

  @Field(type => String)
  @Column('varchar')
  icon = ''

  @Field(type => Int)
  @Column('smallint')
  weight = 0

  @ManyToMany(() => Wiki, wiki => wiki.categories)
  wikis!: Wiki[]
}

export default Category
