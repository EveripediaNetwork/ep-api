import { InjectQueue } from '@nestjs/bull'
import { Body, Controller, Injectable, Post } from '@nestjs/common'
import { Queue } from 'bull'

interface UpdateEvent {
  id: string
  type: string
}

@Injectable()
@Controller('notifications')
export default class NotificationsController {
  constructor(
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  @Post('wiki-update')
  async wiki(@Body() update: UpdateEvent) {
    // console.log(update)
    // await this.notificationQueue.obliterate()
    const job = await this.notificationQueue.add('wikiUpdate', update, {
      delay: 10000,
    })

    console.log(job.id)

    return 'wiki id received successfully'
  }
}
