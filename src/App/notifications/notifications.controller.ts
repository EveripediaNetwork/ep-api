import { Body, Controller, Injectable, Post } from '@nestjs/common'
import PgBoss from 'pg-boss'
import { ConfigService } from '@nestjs/config'
import PgNotificationsQueue from './pgQueue'

interface UpdateEvent {
  id: string
  type: string
}

@Injectable()
@Controller('notifications')
export default class NotificationsController {
  constructor(private configService: ConfigService) {}

  @Post('wiki-update')
  async wiki(@Body() update: UpdateEvent) {
    const username = this.configService.get<string>('DATABASE_USERNAME')
    const host = this.configService.get<string>('DATABASE_HOST')
    const pass = this.configService.get<string>('DATABASE_PASS')
    const dbName = this.configService.get<string>('DATABASE_NAME')
    const boss = new PgBoss(`postgres://${username}:${pass}@${host}/${dbName}`)
    await boss.start()
    // await boss.clearStorage()
    const job = await boss.publish(PgNotificationsQueue.queueName, {
      payload: update,
    })
    console.log(job)

    return 'wiki id received successfully'
  }
}
