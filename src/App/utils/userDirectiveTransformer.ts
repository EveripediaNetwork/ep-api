/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import TokenValidator from './validateToken'

export default function UserDirectiveTransformer(
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
          const { authorization } = context.req.headers
          const id = new TokenValidator().validateToken(
            authorization,
            source.id,
            true,
          )

          const result = await resolve(source, args, context, info)

          if (info.path.prev?.key === 'getProfile' && !id) {
            return null
          }
          return result
        }
        return fieldConfig
      }
    },
  })
}
