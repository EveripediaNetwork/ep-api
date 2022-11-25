import { Command, CommandRunner, Option } from 'nest-commander'
import { Connection } from 'typeorm'
import { UseInterceptors } from '@nestjs/common'
import Subscription from '../../Database/Entities/IqSubscription'
import Notification from '../../Database/Entities/notification.entity'
import SentryInterceptor from '../../sentry/security.interceptor'
import MailService from '../mailer/mail.service'
import Wiki from '../../Database/Entities/wiki.entity'
import UserProfile from '../../Database/Entities/userProfile.entity'

interface CommandOptions {
  loop: boolean
}

const SLEEP_TIME = 5000
const SLEEP_TIME_QUERY = 10000

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

    for (const update of pending) {
      const notificationRepository = this.connection.getRepository(Notification)
      const wikiRepository = this.connection.getRepository(Wiki)
      const userRepository = this.connection.getRepository(UserProfile)
      const wiki = await wikiRepository.findOneOrFail({ id: update.auxId })
      const users = await this.getUsersSubscribed(update.auxId)

      await notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ pending: false })
        .where(update)
        .execute()

      for (const user of users) {
        const { email } = await userRepository.findOneOrFail({
          id: user.userId,
        })
        try {
          const status = await this.mailer.sendIqUpdate(
            email as string,
            wiki.id,
            wiki.title,
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
