import {
  HttpException,
  HttpStatus,
  Injectable,
  ExecutionContext,
  CanActivate,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { Connection } from 'typeorm'
import { GqlExecutionContext } from '@nestjs/graphql'
import User from '../../Database/Entities/user.entity'

@Injectable()
export default class IsActiveGuard implements CanActivate {
  constructor(private connection: Connection) {}

  private async authorizeUser(id: string) {
    const repository = this.connection.getRepository(User)
    const user = await repository.findOneOrFail({
      where: `LOWER(id) = '${id.toLowerCase()}'`,
    })
    if (user.active || undefined) {
      return true
    }
    throw new HttpException('User not allowed!', HttpStatus.FORBIDDEN)
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const ctx = GqlExecutionContext.create(context)
    const requestBody = ctx.getArgByIndex(1)
    if (ctx.getInfo().path.key === 'pinJSON') {
      const { id } = JSON.parse(requestBody.data).user
      return this.authorizeUser(id)
    }
    if (ctx.getInfo().path.key === 'createProfile') {
      const { id } = JSON.parse(requestBody.profileInfo)
      return this.authorizeUser(id)
    }
    return this.authorizeUser(requestBody.id)
  }
}
