import { Command, CommandRunner, Option } from 'nest-commander'
import { Connection } from 'typeorm'
import { UseInterceptors } from '@nestjs/common'
import Subscription from '../../Database/Entities/subscription.entity'
import Notification from '../../Database/Entities/notification.entity'
import SentryInterceptor from '../../sentry/security.interceptor'
import MailService from '../mailer/mail.service'
import Wiki from '../../Database/Entities/wiki.entity'

interface CommandOptions {
  loop: boolean
}

const SLEEP_TIME = 4000
const SLEEP_TIME_QUERY = 3000

@UseInterceptors(SentryInterceptor)
@Command({
  name: 'notifications',
  description: 'Send notifications to subscribed users',
})
class NotificationsCommand implements CommandRunner {
  constructor(private connection: Connection, private mailer: MailService) {}

  async getPedingNotifications() {
    const repository = this.connection.getRepository(Notification)
    return repository.find({
      pending: true,
    })
  }

  async getUsersSubscribed(wiki: string) {
    const repository = this.connection.getRepository(Subscription)
    return repository.find({
      auxiliaryId: wiki,
    })
  }

  async initiateEmailSend(
    pending: Notification[],
    loop?: boolean,
  ): Promise<void> {
    if (pending.length === 0 && loop) {
      await new Promise(r => setTimeout(r, SLEEP_TIME_QUERY))
      const newNotifications = await this.getPedingNotifications()

      console.log(
        `🔁 Running EmailSend on Loop, checking for new notifications! 🔁`,
      )
      await this.initiateEmailSend(newNotifications, loop)
    }

    for await (const update of pending) {
      const notificationRepository = this.connection.getRepository(Notification)
      const wikiRepository = this.connection.getRepository(Wiki)
      const wiki = await wikiRepository.findOneOrFail({ id: update.wikiId })
      const users = await this.getUsersSubscribed(update.wikiId)

      await notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ pending: false })
        .where(update)
        .execute()

      for await (const user of users) {
        try {
          const status = await this.mailer.sendIqUpdate(
            user.email,
            update.wikiId,
            update.title,
            wiki.images[0].id,
            wiki.summary,
          )
          if (status) console.log('✅ Notification sent! ')

          await new Promise(r => setTimeout(r, SLEEP_TIME))
        } catch (ex) {
          console.error(ex)
        }
      }
      await notificationRepository
        .createQueryBuilder()
        .delete()
        .from(Notification)
        .where({ ...update, pending: false })
        .execute()
    }

    if (loop) {
      const newNotifications = await this.getPedingNotifications()
      await this.initiateEmailSend(newNotifications, loop)
    }
  }

  async run(passedParam: string[], options?: CommandOptions): Promise<void> {
    const loop = options?.loop || false
    const newNotifications = await this.getPedingNotifications()

    if (loop) await this.initiateEmailSend(newNotifications, loop)

    await this.initiateEmailSend(newNotifications, loop)

    process.exit()
  }

  @Option({
    flags: '-l, --loop [boolean]',
    description: 'keeps the command running in a loop',
  })
  parseBoolean(val: string): boolean {
    return JSON.parse(val)
  }
}

export default NotificationsCommand
