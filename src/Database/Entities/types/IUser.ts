/* eslint-disable import/no-cycle */
import { Field, ObjectType } from '@nestjs/graphql'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { IWiki } from './IWiki'

export interface IUser {
  id: string
  wikis: IWiki[]
}

@ObjectType()
export class Links {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagram?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  twitter?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lens?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string
}

@ObjectType()
export class Notifications {
  @Field(() => Boolean)
  EVERIPEDIA_NOTIFICATIONS = false

  @Field(() => Boolean)
  WIKI_OF_THE_DAY = false

  @Field(() => Boolean)
  WIKI_OF_THE_MONTH = false

  @Field(() => Boolean)
  EDIT_NOTIFICATIONS = false
}

@ObjectType()
export class AdvancedSettings {
  @Field(() => Boolean)
  SIGN_EDITS_WITH_RELAYER = true
}
