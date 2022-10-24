import { Injectable } from '@nestjs/common'

import { Connection } from 'typeorm'
import Subscription from '../Database/Entities/subscription.entity'
import TokenValidator from './utils/validateToken'

@Injectable()
class WikiSubscriptionService {
  constructor(
    private connection: Connection,
    private tokenValidator: TokenValidator,
  ) {}

  async addSub(
    userId: string,
    wikiId: string,
    token: string,
  ): Promise<Subscription | boolean> {
    const repository = this.connection.getRepository(Subscription)

    if (this.tokenValidator.validateToken(token, userId, false)) {
      const newSub = repository.create({
        userId,
        wikiSubscriptionId: wikiId,
      })

      return repository.save(newSub)
    }
    return false
  }
}
export default WikiSubscriptionService
