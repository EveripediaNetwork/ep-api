/* eslint-disable import/no-cycle */
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
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
  @Field(() => ID, { nullable: true })
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(() => UserProfile, { nullable: true })
  @OneToOne(() => UserProfile, profile => profile.id, { eager: true })
  @JoinColumn()
  @Index('idx_user_profileId')
  profile!: Relation<UserProfile>

  @Field(() => Boolean)
  @Column('boolean', { default: true })
  active!: boolean

  @Field(() => [Wiki])
  @OneToMany(() => Wiki, wiki => wiki.user, { lazy: true })
  wikis!: Relation<IWiki>[]

  @Field(() => [Activity])
  wikisCreated!: Activity[]

  @Field(() => [Activity])
  wikisEdited!: Activity[]
}

export default User
