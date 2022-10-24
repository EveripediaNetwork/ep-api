import { HttpException, HttpStatus, Injectable } from '@nestjs/common'

import { Connection } from 'typeorm'
import Subscription from '../Database/Entities/subscription.entity'
import validateToken from './utils/validateToken'




@Injectable()
class WikiSubscriptionService {
  constructor(
    private connection: Connection,
  ) {}

  async addSub(userId: string, wikiId: string, token: string): Promise<Subscription> {
    const repository = this.connection.getRepository(Subscription)

    const id = validateToken(token)

    if (id === 'Token expired' || id.toLowerCase() !== userId.toLowerCase())
      throw new HttpException('Unathorized', HttpStatus.UNAUTHORIZED)

    const newSub = repository.create({
      userId,
      wikiSubscriptionId: wikiId,
    })

    return repository.save(newSub)
  }
}
export default WikiSubscriptionService
