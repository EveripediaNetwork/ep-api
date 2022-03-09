import { Entity, ManyToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

import { IWiki } from './types/IWiki'
import { ITag } from './types/ITag'

@ObjectType()
@Entity()
class Tag implements ITag {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @ManyToMany('Wiki', 'tags')
  wikis!: IWiki[]
}

export default Tag
