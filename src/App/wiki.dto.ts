import { ArgsType, Field, Int } from '@nestjs/graphql'
import { MinLength } from 'class-validator'
import PaginationArgs from './pagination.args'
import { Direction, OrderBy } from './utils/queryHelpers'

@ArgsType()
export class LangArgs extends PaginationArgs {
  @Field(() => String)
  lang = 'en'

  @Field(() => Direction)
  direction = Direction.DESC

  @Field(() => OrderBy)
  order = OrderBy.UPDATED
}

@ArgsType()
export class TitleArgs extends LangArgs {
  @Field(() => String)
  @MinLength(3)
  title!: string

  @Field(() => Boolean)
  hidden = false
}

@ArgsType()
export class CategoryArgs extends LangArgs {
  @Field(() => String)
  category!: string
}

@ArgsType()
export class ByIdArgs {
  @Field(() => String)
  id!: string

  @Field(() => String)
  lang = 'en'
}

@ArgsType()
export class PromoteWikiArgs extends ByIdArgs {
  @Field(() => Int)
  level = 0
}
