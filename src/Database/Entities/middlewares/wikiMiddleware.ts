import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql'

const dateMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next()
  if (value === undefined) {
    return null
  }
  return new Date(value)
}

export default dateMiddleware
