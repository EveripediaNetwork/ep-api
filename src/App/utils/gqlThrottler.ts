import { Injectable, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export default class GqlThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    console.log('Header', req.headers['X-Forwarded-For'])
    console.log('Request IP', req.ip)
    return req.headers['X-Forwarded-For'] || req.ip
  }

  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context)
    const ctx = gqlCtx.getContext()
    return { req: ctx.req, res: ctx.req.res }
  }
}
