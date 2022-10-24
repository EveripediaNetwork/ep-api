/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import { getConnection } from 'typeorm'
import TokenValidator from './validateToken'
import User from '../../Database/Entities/user.entity'

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

          const id = new TokenValidator().validateToken(authorization, true)

          const result = await resolve(source, args, context, info)

          if (info.path.prev?.key === 'getProfile') {
            if (id === 'Token expired') return null
            const user = await getConnection()
              .getRepository(User)
              .findOne({
                where: `LOWER(id) = '${id.toLowerCase()}'`,
              })
            if (source.id.toLowerCase() !== user?.id.toLowerCase()) {
              return null
            }
          }
          return result
        }
        return fieldConfig
      }
    },
  })
}
