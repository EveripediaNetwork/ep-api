import { Body, Controller, Injectable, Post } from '@nestjs/common'
import { Connection } from 'typeorm'
import Subscription from '../../Database/Entities/subscription.entity'

interface UpdateEvent {
  id: string
  type: string
}

@Injectable()
@Controller('notifications')
export default class NotificationsController {
  constructor(private connection: Connection) {}

  @Post('wiki-update')
  async wiki(@Body() update: UpdateEvent) {
    const repository = this.connection.getRepository(Subscription)
    await repository
      .createQueryBuilder()
      .update(Subscription)
      .set({ pending: true })
      .where({ auxiliaryId: update.id })
      .execute()

    return true
  }
}
