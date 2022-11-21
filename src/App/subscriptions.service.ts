import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import IqSubscription from '../Database/Entities/IqSubscription'
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
  ): Promise<IqSubscription | undefined> {
    const repository = this.connection.getRepository(IqSubscription)
    return repository.findOne({
      where: {
        userId: args.userId,
        subscriptionType: args.subscriptionType,
        auxiliaryId: args.auxiliaryId,
      },
    })
  }

  async getSubs(
    token: string,
    id: string,
  ): Promise<IqSubscription[] | boolean> {
    const repository = this.connection.getRepository(IqSubscription)
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
  ): Promise<IqSubscription | boolean> {
    const repository = this.connection.getRepository(IqSubscription)

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
    const repository = this.connection.getRepository(IqSubscription)
    if (!this.tokenValidator.validateToken(token, id, false)) {
      return false
    }
    await repository
      .createQueryBuilder()
      .delete()
      .from(IqSubscription)
      .where(args)
      .execute()
    return true
  }
}
export default WikiSubscriptionService
