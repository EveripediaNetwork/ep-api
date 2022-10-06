import {
  Injectable,
  ExecutionContext,
  CanActivate,
  //   HttpException,
  //   HttpStatus,
} from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Observable } from 'rxjs'
// import validateToken from './validateToken'

@Injectable()
export default class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const whitelist = JSON.parse(process.env.ADMIN_USERS || '')

    const ctx = GqlExecutionContext.create(context)
    const { authorization } = ctx.getContext().req.headers
    // const id = validateToken(authorization)

    // if (id === 'Token expired')
    //   throw new HttpException('Unathorized', HttpStatus.UNAUTHORIZED)

    return whitelist.some(
      (e: string) => e.toLowerCase() === authorization.toLowerCase(),
    )
    // return whitelist.some((e: string) => e.toLowerCase() === id.toLowerCase())
  }
}
