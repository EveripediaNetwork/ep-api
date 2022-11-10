import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import PgBoss from 'pg-boss'

@Injectable()
export default class PgNotificationsQueue implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  public static readonly queueName = 'notifications'

  public async onModuleInit() {
    const username = this.configService.get<string>('DATABASE_USERNAME')
    const host = this.configService.get<string>('DATABASE_HOST')
    const pass = this.configService.get<string>('DATABASE_PASS')
    const dbName = this.configService.get<string>('DATABASE_NAME')

    const boss = new PgBoss(`postgres://${username}:${pass}@${host}/${dbName}`)
    await boss.start()

    boss.on('error', error => Logger.error(error))
  }
}
