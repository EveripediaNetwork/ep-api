/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'
// import UserService from '../../App/user.service'


  export default function UserDirectiveTransformer(schema: GraphQLSchema, directiveName: string) {
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
            const { authorization } = context.req.headers
            // console.log(authorization)
            const result = await resolve(source, args, context, info)
            // const a = this.userSevice.validateUser(authorization)

            if (authorization) {
              return null
            }
            return result
          }
          return fieldConfig
        }
      },
    })
  }
