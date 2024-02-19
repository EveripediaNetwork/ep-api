/* eslint-disable max-classes-per-file */
import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'
import { MinLength, Validate } from 'class-validator'
import ValidStringParams from '../utils/customValidator'
import { Direction, OrderBy } from '../general.args'
import PaginationArgs from '../pagination.args'

export const eventTag = 'events'
export const eventDate = 'EVENT'

@ArgsType()
export class LangArgs extends PaginationArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  lang = 'en'

  @Field(() => Direction)
  direction = Direction.DESC

  @Field(() => OrderBy)
  order = OrderBy.UPDATED
}

@ArgsType()
export class TitleArgs extends LangArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  @MinLength(3)
  title!: string

  @Field(() => Boolean)
  hidden = false
}

@ArgsType()
export class CategoryArgs extends LangArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  category!: string
}

@ArgsType()
export class ByIdArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string

  @Field(() => String)
  lang = 'en'
}

@ArgsType()
export class PromoteWikiArgs extends ByIdArgs {
  @Field(() => Int)
  level = 0
}

@ObjectType()
export class WikiUrl {
  @Field(() => String)
  @Validate(ValidStringParams)
  wiki!: string
}

@ArgsType()
export class EventArgs extends LangArgs {
  @Field(() => [String], { nullable: true })
  @Validate(ValidStringParams)
  ids?: string[]

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  startDate?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  endDate?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  categoryId?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  title?: string

  @Field(() => Boolean)
  hidden = false
}
