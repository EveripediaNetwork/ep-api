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

  async findSub(args: WikiSubscriptionArgs) {
    const repository = this.connection.getRepository(Subscription)
    return repository.findOne({
      where: {
        userId: args.userId,
        notificationType: args.notificationType,
        auxiliaryId: args.auxiliaryId,
      },
    })
  }

  async addSub(
    args: WikiSubscriptionArgs,
    token: string,
  ): Promise<Subscription | boolean> {
    const repository = this.connection.getRepository(Subscription)

    if (!this.tokenValidator.validateToken(token, args.userId, false)) {
      return false
    }
    if (await this.findSub(args)) return true

    const newSub = repository.create(args)
    return repository.save(newSub)
  }
}
export default WikiSubscriptionService
