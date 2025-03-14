import { Injectable } from '@nestjs/common'
import { DataSource, ILike, Repository } from 'typeorm'
import IqSubscription from '../../Database/Entities/IqSubscription'
import { WikiSubscriptionArgs } from '../../Database/Entities/types/IWiki'
import TokenValidator from '../utils/validateToken'

@Injectable()
class WikiSubscriptionService {
  constructor(
    private dataSource: DataSource,
    private tokenValidator: TokenValidator,
  ) {}

  async repository(): Promise<Repository<IqSubscription>> {
    return this.dataSource.getRepository(IqSubscription)
  }

  private async findSub(
    args: WikiSubscriptionArgs,
  ): Promise<IqSubscription | null> {
    return (await this.repository()).findOne({
      where: {
        userId: ILike(args.userId),
        subscriptionType: args.subscriptionType,
        auxiliaryId: args.auxiliaryId,
      },
    })
  }

  async getSubs(
    token: string,
    id: string,
  ): Promise<IqSubscription[] | boolean> {
    if (!this.tokenValidator.validateToken(token, id, false)) {
      return false
    }
    return (await this.repository()).find({
      where: {
        userId: ILike(id),
      },
    })
  }

  async addSub(
    token: string,
    args: WikiSubscriptionArgs,
  ): Promise<IqSubscription | boolean> {
    if (!this.tokenValidator.validateToken(token, args.userId, false)) {
      return false
    }
    if (await this.findSub(args)) return true
    const newSub = (await this.repository()).create(args)
    return (await this.repository()).save(newSub)
  }

  async removeSub(
    token: string,
    id: string,
    args: WikiSubscriptionArgs,
  ): Promise<boolean> {
    if (!this.tokenValidator.validateToken(token, id, false)) {
      return false
    }
    await (await this.repository())
      .createQueryBuilder()
      .delete()
      .from(IqSubscription)
      .where('LOWER(userId) = LOWER(:userId)', { userId: args.userId })
      .andWhere({
        subscriptionType: args.subscriptionType,
        auxiliaryId: args.auxiliaryId,
      })
      .execute()
    return true
  }
}
export default WikiSubscriptionService
