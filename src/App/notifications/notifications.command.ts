import { Command, CommandRunner, Option } from 'nest-commander'
import { Connection } from 'typeorm'
import { UseInterceptors } from '@nestjs/common'
import Subscription from '../../Database/Entities/subscription.entity'
import SentryInterceptor from '../../sentry/security.interceptor'
import MailService from '../mailer/mail.service'

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
    const repository = this.connection.getRepository(Subscription)
    const pendingNotifications = await repository.find({
      pending: true,
    })
    return pendingNotifications
  }

  async initiateEmailSend(
    pending: Subscription[],
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

    for (const user of pending) {
      const repository = this.connection.getRepository(Subscription)
      try {
        const stat = await this.mailer.sendIqUpdate(user.email)
        if (stat)
          await repository
            .createQueryBuilder()
            .update(Subscription)
            .set({ pending: false })
            .where(user)
            .execute()
        console.log('✅ Notification sent! ')

        await new Promise(r => setTimeout(r, SLEEP_TIME))
      } catch (ex) {
        console.error(ex)
      }
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
