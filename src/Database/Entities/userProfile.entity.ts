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
} from '@nestjs/graphql'
import { Type } from 'class-transformer'
import {
  IsString,
  MaxLength,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator'
import { Links, Notifications, AdvancedSettings } from './types/IUser'
import Wiki from './wiki.entity'
import skipMiddleware from './middlewares/skipMiddleware'
import { UserActivity, UserWikis, WikiCount } from '../../App/User/user.dto'

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
  @IsOptional()
  @IsString()
  @MaxLength(25)
  username?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 250,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  bio?: string

  @Directive('@isUser')
  @Field({ nullable: true, middleware: [skipMiddleware] })
  @Column('varchar', {
    length: 100,
    nullable: true,
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 46,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(46)
  avatar?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 46,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(46)
  banner?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Links)
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

  @Field(() => UserWikis)
  wikisCreated!: UserActivity | WikiCount

  @Field(() => UserWikis)
  wikisEdited!: UserActivity | WikiCount

  @Field(() => [Wiki])
  wikiSubscribed!: Wiki[]
}

export default UserProfile
