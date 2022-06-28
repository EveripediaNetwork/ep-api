/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import { getConnection } from 'typeorm';
import validateToken from './validateToken';
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
          const id = validateToken(authorization)
          const result = await resolve(source, args, context, info)
          if (id === 'Token expired') return null
          if (info.path.prev?.key === 'getProfile') {
            const user = await getConnection()
              .getRepository(User)
              .findOneOrFail({
                where: `LOWER(id) = '${id.toLowerCase()}'`,
              })
            if (source.id !== user.id) {
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

