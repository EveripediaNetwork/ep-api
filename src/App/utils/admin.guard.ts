import {
  Injectable,
  ExecutionContext,
  CanActivate,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Observable } from 'rxjs'
import validateToken from './validateToken'

@Injectable()
export default class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // TODO: Make all admin ids lower case
    const whitelist = ['0x5456afea3aa035088fe1f9aa36509b320360a89e']

    const ctx = GqlExecutionContext.create(context).getContext()
    const { authorization } = ctx.req.headers
    const id = validateToken(authorization)
    // const id = authorization

    if (id === 'Token expired')
      throw new HttpException('Unathorized', HttpStatus.UNAUTHORIZED)

    if (!whitelist.includes(id.toLowerCase())) {
      return false
    }

    return true
  }
}
