/* eslint-disable consistent-return */
import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql'

const enumMiddleWare: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next()
  if (value === '1') {
    return 1
  }
  if (value === '0') {
    return 0
  }
}

export default enumMiddleWare
