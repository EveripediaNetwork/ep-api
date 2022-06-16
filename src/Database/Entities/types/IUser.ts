import { Field, ObjectType } from '@nestjs/graphql'
import { IWiki } from './IWiki'

export interface IUser {
  id: string
  wikis: IWiki[]
}

@ObjectType()
export class Author {
  @Field({ nullable: true })
  id?: string
}
