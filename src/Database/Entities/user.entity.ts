/* eslint-disable import/no-cycle */
import { Entity, JoinColumn, OneToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

import { IUser } from './types/IUser'
import { IWiki } from './types/IWiki'
import Wiki from './wiki.entity'
import Activity from './activity.entity'

@ObjectType()
@Entity()
class User implements IUser {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(() => [Wiki])
  @OneToMany('Wiki', 'user', { lazy: true })
  wikis!: IWiki[]

  @Field(() => [Activity])
  @OneToMany(() => Wiki, wiki => wiki.author)
  @JoinColumn()
  wikisCreated!: Activity[]

  @Field(() => [Activity])
  @OneToMany(() => Wiki, wiki => wiki.author)
  @JoinColumn()
  wikisEdited!: Activity[]
}

export default User
