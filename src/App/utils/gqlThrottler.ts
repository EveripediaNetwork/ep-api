import { Injectable, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export default class GqlThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    console.log(req.ips)
    return req.ips.length ? req.ips[0] : req.ip // individualize IP extraction to meet your own needs
  }
  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context)
    const ctx = gqlCtx.getContext()
    console.log(ctx.req.ip)
    return { req: ctx.req, res: ctx.req.res }
  }
}
