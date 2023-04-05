/* eslint-disable max-classes-per-file */
import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'
import { MinLength, Validate } from 'class-validator'
import PaginationArgs from '../pagination.args'
import ValidStringParams from '../utils/customValidator'
import { Direction, OrderBy } from '../utils/queryHelpers'

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

@ArgsType()
export class PageViewArgs {
  @Field(() => Int)
  amount!: number

  @Field(() => String, { description: 'Format <YYYY/MM/DD>' })
  @Validate(ValidStringParams)
  startDay!: string

  @Field(() => String, { description: 'Format <YYYY/MM/DD>' })
  @Validate(ValidStringParams)
  endDay!: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  category?: string
}

@ObjectType()
export class WikiUrl {
  @Field(() => String)
  @Validate(ValidStringParams)
  wiki!: string
}
