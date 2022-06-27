/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'

export default function userDirectiveTransformer(
  schema: GraphQLSchema,
  directiveName: string,
) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const upperDirective = getDirective(
        schema,
        fieldConfig,
        directiveName,
      )?.[0]

      if (upperDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig

        fieldConfig.resolve = async (source, args, context, info) => {
          // TODO: VALIDATE USER AND RETURN EMAIL only when valid
          console.log(context)
          const result = await resolve(source, args, context, info)
          const a = false
          if (a) {
            // return null
          }
          return result
        }
        return fieldConfig
      }
    },
  })
}
