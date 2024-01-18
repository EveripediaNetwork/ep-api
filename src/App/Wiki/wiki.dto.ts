/* eslint-disable max-classes-per-file */
import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'
import { MinLength, Validate } from 'class-validator'
import ValidStringParams from '../utils/customValidator'
import { Direction, OrderBy } from '../general.args'
import PaginationArgs from '../pagination.args'

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

export interface Wiki {
  id: string;
}

export class MediaError extends Error {
  constructor(message: string,
    public readonly wikiId?: string,
    public readonly wikiObject?: Wiki) {
      super(message);
      Object.setPrototypeOf(this, MediaError.prototype);
    }
}