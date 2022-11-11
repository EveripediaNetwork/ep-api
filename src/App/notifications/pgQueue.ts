import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import PgBoss from 'pg-boss'
import { Connection } from 'typeorm'
import Subscription from '../../Database/Entities/subscription.entity'

@Injectable()
export default class PgNotificationsQueue implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private connection: Connection,
  ) {}

  public static readonly queueName = 'notifications'

  public async onModuleInit() {
    const username = this.configService.get<string>('DATABASE_USERNAME')
    const host = this.configService.get<string>('DATABASE_HOST')
    const pass = this.configService.get<string>('DATABASE_PASS')
    const dbName = this.configService.get<string>('DATABASE_NAME')

    const boss = new PgBoss(`postgres://${username}:${pass}@${host}/${dbName}`)
    await boss.start()

    boss.on('error', error => Logger.error(error))
    // await boss.subscribe(PgNotificationsQueue.queueName, 'any')
    await boss.work(PgNotificationsQueue.queueName, this.handleWikiUpdate)
  }

  async handleWikiUpdate(job: any) {
    const repository = this.connection.getRepository(Subscription)
    const usersSubscribed = await repository.find({
      auxiliaryId: job.data.id as string,
    })

    for await (const user of usersSubscribed) {
      // TODO: send mails and push notifications here
      console.log(user.email)
    }
    // console.log(usersSubscribed)
    console.log(job.data)
    return true
  }
}
