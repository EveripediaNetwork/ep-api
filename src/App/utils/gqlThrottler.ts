import { Injectable, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export default class GqlThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    console.log(req.ips)
    console.log(req.headers['x-forwarded-for'])
    console.log(req.connection.remoteAddress)
    return req.headers['x-forwarded-for'] || req.ip
  }
  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context)
    const ctx = gqlCtx.getContext()
    console.log(ctx.req.ip)
    console.log(ctx.req.headers['x-forwarded-for'])
    console.log(ctx.req.connection.remoteAddress)
    return { req: ctx.req, res: ctx.req.res }
  }
}
