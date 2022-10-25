/* eslint-disable import/no-cycle */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import {
  Directive,
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  FieldMiddleware,
  MiddlewareContext,
  NextFn,
} from '@nestjs/graphql'
import { Links, Notifications, AdvancedSettings } from './types/IUser'
import Activity from './activity.entity'
import Wiki from './wiki.entity'

export const skipMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next()
  const allowedEndpoints = ['userById', 'getProfile', 'getProfileLikeUsername']
  const { prev } = ctx.info.path
  const allowed = allowedEndpoints.some(
    endpoint =>
      endpoint === `${prev?.prev?.key}` || endpoint === `${prev?.key}`,
  )
  if (!allowed) {
    return null
  }
  return value
}

@ObjectType()
@Entity()
class UserProfile {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 25,
    nullable: true,
    unique: true,
  })
  username?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 250,
    nullable: true,
  })
  bio?: string

  @Directive('@isUser')
  @Field({ nullable: true, middleware: [skipMiddleware] })
  @Column('varchar', {
    length: 100,
    nullable: true,
  })
  email?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 46,
    nullable: true,
  })
  avatar?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 46,
    nullable: true,
  })
  banner?: string

  @Field(() => [Links], { nullable: true })
  @Column('jsonb', { default: [] })
  links?: Links[]

  @Directive('@isUser')
  @Field(() => [Notifications], {
    nullable: true,
    middleware: [skipMiddleware],
  })
  @Column('jsonb', { default: [new Notifications()] })
  notifications!: Notifications[]

  @Directive('@isUser')
  @Field(() => [AdvancedSettings], {
    nullable: true,
    middleware: [skipMiddleware],
  })
  @Column('jsonb', { default: [new AdvancedSettings()] })
  advancedSettings!: AdvancedSettings[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date

  @Field(() => Boolean)
  active!: boolean

  @Field(() => [Activity])
  wikisCreated!: Activity[]

  @Field(() => [Activity])
  wikisEdited!: Activity[]

  @Field(() => [Wiki])
  wikiSubscribed!: Wiki[]
}

export default UserProfile
