import {
  HttpException,
  HttpStatus,
  Injectable,
  ExecutionContext,
  CanActivate,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { Connection } from 'typeorm'

// @Injectable()
// export default class IsActive {
//   constructor(private connection: Connection) {}

//   async authorizeUser(id: string): Promise<boolean | Error> {
//     const repository = this.connection.getRepository(User)
//     const user = await repository.findOneOrFail({
//       where: `LOWER(id) = '${id.toLowerCase()}'`,
//     })
//     if (user.active || undefined) {
//       return true
//     }
//     throw new HttpException('User not allowed!', HttpStatus.FORBIDDEN)
//   }
// }

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
    console.log(user.active)
    if (user.active || undefined) {
      return true
    }
    throw new HttpException('User not allowed!', HttpStatus.FORBIDDEN)
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // const whitelist = JSON.parse(process.env.ADMIN_USERS || '')
    const ctx = GqlExecutionContext.create(context)
    console.log(ctx.getArgByIndex(1))
    if (ctx.getInfo().path.key === 'pinJSON') {
      const { id } = JSON.parse(context.getArgByIndex(1).data).user
      console.log(JSON.parse(context.getArgByIndex(1).data).user.id)
      return this.authorizeUser(id)
    }
    console.log(ctx.getArgByIndex(1).id)
    return this.authorizeUser(ctx.getArgByIndex(1).id)
    // console.log(ctx.getContext())

    return true
  }
}
