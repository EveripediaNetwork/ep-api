import { InjectQueue, OnQueueActive, Process, Processor } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { Connection } from 'typeorm'
import Subscription from '../../Database/Entities/subscription.entity'

@Processor('notifications')
export default class NotificationsProcessor {
  constructor(
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
    private connection: Connection,
  ) {}

  @Process('wikiUpdate')
  async handleWikiUpdate(job: Job) {
    const repository = this.connection.getRepository(Subscription)
    const emails = await repository.find({ auxiliaryId: job.data.id as string })
    console.log(emails)
    console.log(job.data)
    return true
  }

  @OnQueueActive()
  async onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    )
    // await this.notificationQueue.empty()
  }
}
