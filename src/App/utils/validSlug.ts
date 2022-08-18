import { Injectable } from '@nestjs/common'
import { createUnionType, Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Slug {
  @Field()
  id!: string
}

@ObjectType()
export class Valid {
  @Field()
  valid!: boolean
}

export const SlugResult = createUnionType({
  name: 'SlugResult',
  types: () => [Slug, Valid] as const,
  resolveType(value) {
    if (value.id) {
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
        const wikiSlug = id.split(exp)[0]
        const identifier = Number(id.split(exp)[1].split('-')[1]) + 1
        return { id: `${wikiSlug}-${identifier}` }
      }
      return { id: `${id}-1` }
    }
    return { valid: true }
  }
}
