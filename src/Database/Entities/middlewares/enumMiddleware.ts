import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql'

const enumMiddleWare: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next()
  if (value === '1') {
    return 1
  }
  return 0
}

export default enumMiddleWare
