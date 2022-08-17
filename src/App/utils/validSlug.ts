import { Injectable } from '@nestjs/common'
import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Slug {
  @Field(() => String || Boolean)
  slug?: string | boolean
}

@Injectable()
export  class ValidSlug {
  async validateSlug(id?: string): Promise<string | boolean> {
    const exp = /(-[0-9]+$)/g
    if (id) {
      if (exp.test(id)) {
        const nId = id.split(exp)[0]
        const kId = Number(id.split(exp)[1].split('-')[1]) + 1
        return `${nId}-${kId}`
      }
      return `${id}-1`
    }
    return true
  }
}
