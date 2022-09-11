/* eslint-disable import/no-cycle */
import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql'
import { getWikiSummary } from '~/../src/App/utils/getWikiSummary'

export const dateMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next()
  if (value === undefined) {
    return null
  }
  return new Date(value)
}

export const summaryMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
) => getWikiSummary(ctx.source)
