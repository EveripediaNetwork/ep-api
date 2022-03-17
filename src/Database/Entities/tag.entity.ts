/* eslint-disable import/no-cycle */
import { Entity, ManyToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'
import Wiki from './wiki.entity'

@ObjectType()
@Entity()
class Tag {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @ManyToMany(() => Wiki, wiki => wiki.tags)
  wikis!: Wiki[]
}

export default Tag
