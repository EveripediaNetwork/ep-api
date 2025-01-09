import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql'
import Decimal from 'decimal.js'

const tokenDecimalMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next()
  const rawValue =
    ctx.info.operation.selectionSet.loc?.source.body.includes('Raw: true')

  if (!rawValue) {
    const decimal = new Decimal(value)
    const updatedValue = decimal.toFixed(2)
    return updatedValue
  }
  return value
}
export default tokenDecimalMiddleware
