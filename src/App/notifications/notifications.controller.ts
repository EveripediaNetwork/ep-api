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
  async wikiUpdate(@Body() update: UpdateEvent ) {
    console.log(update)
    await this.notificationQueue.add('wikiUpdate', {
      foo: 'here',
    })
    return 'wiki id received successfully'
  }
}
