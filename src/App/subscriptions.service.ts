import { Injectable } from '@nestjs/common'

import { Connection } from 'typeorm'
import Subscription, {
  SubscriptionContent,
} from '../Database/Entities/subscription.entity'
import TokenValidator from './utils/validateToken'

@Injectable()
class WikiSubscriptionService {
  constructor(
    private connection: Connection,
    private tokenValidator: TokenValidator,
  ) {}

  async addSub(
    userId: string,
    subscription: SubscriptionContent[],
    token: string,
  ): Promise<Subscription | boolean> {
    const repository = this.connection.getRepository(Subscription)

    if (this.tokenValidator.validateToken(token, userId, false)) {
      const oldSub = await repository
        .createQueryBuilder('subscription')
        .where(
          `subscription.subscription -> 0 ->> 'id' = '${subscription[0].id}' AND subscription.subscription -> 0 ->> 'type' = '${subscription[0].type}' AND
          subscription."userId" = '${userId}' `,
        )
        .getOne()

      if (!oldSub) {
        const newSub = repository.create({
          userId,
          subscription,
        })

        return repository.save(newSub)
      }
    }
    return false
  }
}
export default WikiSubscriptionService
