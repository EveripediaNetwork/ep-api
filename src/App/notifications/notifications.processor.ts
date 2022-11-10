import {
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueDrained,
  Process,
  Processor,
} from '@nestjs/bull'
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

  @OnQueueActive()
  async onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}`)
  }

  @OnQueueCompleted()
  async onCompleted(jb: Job) {
    console.log(jb.data)
  }

  @OnQueueDrained()
  async onDrain() {
    const jobs = await this.notificationQueue.getJobCounts().then()
    // console.log(`we have ${jobs} jobs left`)
    console.log(jobs)
    await this.notificationQueue.obliterate()
    console.log('Done')
  }
}
