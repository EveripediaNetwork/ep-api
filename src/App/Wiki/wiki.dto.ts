/* eslint-disable max-classes-per-file */
import { ArgsType, Field, Int, ObjectType, PickType } from '@nestjs/graphql'
import { Max, Min, MinLength, Validate } from 'class-validator'
import {
  ValidStringParams,
  ValidDateParams,
  ValidStringArrayParams,
} from '../utils/customValidator'
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

  @Field(() => Boolean)
  hidden = false
}

@ArgsType()
export class ExplorerArgs extends LangArgs {}

@ArgsType()
export class TitleArgs extends LangArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  @MinLength(2)
  title!: string
}

@ArgsType()
export class CategoryArgs extends LangArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  category!: string

  @Field(() => [String], { nullable: true })
  @Validate(ValidStringParams)
  tagIds?: string[]
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

  @Field(() => Boolean)
  featuredEvents = false
}

@ObjectType()
export class WikiUrl {
  @Field(() => String)
  @Validate(ValidStringParams)
  wiki!: string
}

@ArgsType()
export class EventDefaultArgs extends LangArgs {
  @Field(() => String, { nullable: true })
  @Validate(ValidDateParams)
  startDate?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidDateParams)
  endDate?: string
}

@ArgsType()
export class EventArgs extends EventDefaultArgs {
  @Field(() => [String], { nullable: true })
  @Validate(ValidStringArrayParams)
  tagIds?: string[]

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  title?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  category?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  blockchain?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  continent?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  country?: string
}

export function hasField(
  ast: any,
  fieldName: string,
  options?: { fragmentType: string },
): boolean {
  let fieldExists = false

  function traverse(node: any) {
    if (node.kind === 'Field' && node.name.value === fieldName && !options) {
      fieldExists = true
    } else if (node.kind === 'InlineFragment' && options?.fragmentType) {
      if (
        node.typeCondition &&
        node.typeCondition.name.value === options.fragmentType
      ) {
        fieldExists = true
      }
    } else if (node.selectionSet) {
      node.selectionSet.selections.forEach(traverse)
    }
  }
  ast.definitions.forEach((definition: any) => {
    traverse(definition)
  })

  return fieldExists
}
