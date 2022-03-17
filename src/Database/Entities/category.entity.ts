/* eslint-disable import/no-cycle */
import { Column, Entity, ManyToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import Wiki from './wiki.entity'

@ObjectType()
@Entity({
  orderBy: {
    weight: 'DESC',
    id: 'ASC',
  },
})
class Category {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(() => String)
  @Column('varchar')
  title = ''

  @Field(() => String)
  @Column('text')
  description = ''

  @Field(() => String)
  @Column('varchar')
  cardImage = '' // TODO: get defaults for hero card and icon

  @Field(() => String)
  @Column('varchar')
  heroImage = ''

  @Field(() => String)
  @Column('varchar')
  icon = ''

  @Field(() => Int)
  @Column('smallint')
  weight = 0

  @ManyToMany(() => Wiki, wiki => wiki.categories)
  wikis!: Wiki[]
}

export default Category
