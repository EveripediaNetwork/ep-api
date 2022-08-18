/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */
import { Injectable } from '@nestjs/common'
import { createUnionType, Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Slug {
  @Field()
  name!: string
}

@ObjectType()
export class Valid {
  @Field()
  valid!: boolean
}

export const ResultUnion = createUnionType({
  name: 'ResultUnion',
  types: () => [Slug, Valid] as const,
  resolveType(value) {
    if (value.name) {
      return 'Slug'
    }
    if (value.valid) {
      return 'Valid'
    }
    return null
  },
})

@Injectable()
export class ValidSlug {
  async validateSlug(id?: string): Promise<Slug | Valid> {
    const exp = /(-[0-9]+$)/g
    if (id) {
      if (exp.test(id)) {
        const nId = id.split(exp)[0]
        const kId = Number(id.split(exp)[1].split('-')[1]) + 1
        return {name: `${nId}-${kId}`}
      }
      return { name: `${id}-1` }
    }
    return { valid: true }
  }
}
