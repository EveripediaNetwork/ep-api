import {
  //   OnGlobalQueueWaiting,
  //   OnQueueProgress,
  //   OnQueueWaiting,
  Process,
  Processor,
} from '@nestjs/bull'
import { Job } from 'bull'

@Processor('notifications')
export default class NotificationsProcessor {
  @Process('wikiUpdate')
  async handleWikiUpdate(job: Job<unknown>) {
    // let progress = 0
    // for (let i = 0; i < 10; i += 1) {
    //   await doSomething(job.data)
    console.log(job)
    //   progress += 1
    //   await job.progress(progress)
    // }
    return {}
  }

  //   @OnGlobalQueueWaiting()
  //   onActive(job: Job) {
  //     console.log(
  //       `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
  //     )
  //   }
}
