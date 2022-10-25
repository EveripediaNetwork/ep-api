import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Subscription from '../Database/Entities/subscription.entity'
import { WikiSubscriptionArgs } from '../Database/Entities/types/IWiki'
import TokenValidator from './utils/validateToken'

@Injectable()
class WikiSubscriptionService {
  constructor(
    private connection: Connection,
    private tokenValidator: TokenValidator,
  ) {}

  private async findSub(
    args: WikiSubscriptionArgs,
  ): Promise<Subscription | undefined> {
    const repository = this.connection.getRepository(Subscription)
    return repository.findOne({
      where: {
        userId: args.userId,
        notificationType: args.notificationType,
        auxiliaryId: args.auxiliaryId,
      },
    })
  }

  async getSubs(token: string, id: string): Promise<Subscription[] | boolean> {
    const repository = this.connection.getRepository(Subscription)
    if (!this.tokenValidator.validateToken(token, id, false)) {
      return false
    }
    return repository.find({
      where: {
        userId: id,
      },
    })
  }

  async addSub(
    token: string,
    args: WikiSubscriptionArgs,
  ): Promise<Subscription | boolean> {
    const repository = this.connection.getRepository(Subscription)

    if (!this.tokenValidator.validateToken(token, args.userId, false)) {
      return false
    }
    if (await this.findSub(args)) return true

    const newSub = repository.create(args)
    return repository.save(newSub)
  }

  async removeSub(
    token: string,
    id: string,
    args: WikiSubscriptionArgs,
  ): Promise<boolean> {
    const repository = this.connection.getRepository(Subscription)
    if (!this.tokenValidator.validateToken(token, id, false)) {
      return false
    }
    await repository
      .createQueryBuilder()
      .delete()
      .from(Subscription)
      .where(
        `"userId" = ':userId' AND "notificationType" = ':notificationType' AND "auxiliaryId" = ':auxiliaryId'`,
        {
          args,
        },
      )
      .execute()
    return true
  }
}
export default WikiSubscriptionService
