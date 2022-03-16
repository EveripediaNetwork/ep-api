/* eslint-disable import/no-cycle */
import { Entity, JoinTable, ManyToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

import { IWiki } from './types/IWiki'
import { ITag } from './types/ITag'
import Wiki from './wiki.entity'

@ObjectType()
@Entity()
class Tag implements ITag {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(() => [Wiki])
  @ManyToMany('Wiki', 'tags')
  @JoinTable()
  wikis!: IWiki[]
}

export default Tag
