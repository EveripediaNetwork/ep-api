/* eslint-disable import/no-cycle */
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

import { IUser } from './types/IUser'
import { IWiki } from './types/IWiki'
import Wiki from './wiki.entity'
import Activity from './activity.entity'
import UserProfile from './userProfile.entity'

@ObjectType()
@Entity()
class User implements IUser {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(() => UserProfile, { eager: true, nullable: true })
  @OneToOne(() => UserProfile)
  @JoinColumn()
  profile!: UserProfile

  @Field(() => Boolean)
  @Column('boolean', { default: true })
  active!: boolean

  @Field(() => [Wiki])
  @OneToMany('Wiki', 'user', { lazy: true })
  wikis!: IWiki[]

  @Field(() => [Activity])
  wikisCreated!: Activity[]

  @Field(() => [Activity])
  wikisEdited!: Activity[]
}

export default User
