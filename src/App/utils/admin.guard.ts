import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Observable } from 'rxjs'
import TokenValidator from './validateToken'

@Injectable()
export default class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const whitelist = JSON.parse(process.env.ADMIN_USERS || '')

    const ctx = GqlExecutionContext.create(context)
    const { authorization } = ctx.getContext().req.headers
    const id = new TokenValidator().validateToken(authorization, undefined, false)

    return whitelist.some((e: string) => e.toLowerCase() === id.toLowerCase())
  }
}
