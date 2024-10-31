import { Command, CommandRunner, Option } from 'nest-commander'
import { DataSource, ILike } from 'typeorm'
import { Cache } from 'cache-manager'
import { CACHE_MANAGER, Inject } from '@nestjs/common'
import Subscription from '../../Database/Entities/IqSubscription'
import Notification from '../../Database/Entities/notification.entity'
import MailService from '../mailer/mail.service'
import Wiki from '../../Database/Entities/wiki.entity'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Activity from '../../Database/Entities/activity.entity'

interface CommandOptions {
  loop: boolean
}

const SLEEP_TIME = 5000
const SLEEP_TIME_QUERY = 10000

@Command({
  name: 'notifications',
  description: 'Send notifications to subscribed users',
})
class NotificationsCommand implements CommandRunner {
  constructor(
    private dataSource: DataSource,
    private mailer: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPedingNotifications() {
    const repository = this.dataSource.getRepository(Notification)
    return repository.find({
      where: { pending: true },
    })
  }

  async getUsersSubscribed(wiki: string) {
    const repository = this.dataSource.getRepository(Subscription)
    return repository.find({
      where: { auxiliaryId: wiki },
    })
  }

  private randomWikis = (size: number, arr: any[], id: string) => {
    const filtered = arr.filter((e: any) => e.id !== id)
    const objs: any[] = []
    let counter = 0

    while (counter < size) {
      const rand = filtered[Math.floor(Math.random() * filtered.length)]
      if (!objs.some((an) => an === rand)) {
        objs.push(rand)
        counter += 1
      }
    }
    return objs
  }

  private async getMoreWikis() {
    const repository = this.dataSource.getRepository(Activity)
    const id = 'latestActivity'

    const moreWikis = await this.cacheManager.get(id)
    if (moreWikis) return moreWikis

    const result = await repository.query(`
    SELECT w.title, w.summary, w.id FROM
        (
            SELECT "wikiId", Max(datetime) as MaxDate  
            FROM activity
            WHERE type = '1'
            GROUP BY "activity"."wikiId"
        ) r
        INNER JOIN "activity" d
        ON d."wikiId"=r."wikiId" AND d.datetime=r.MaxDate
        INNER JOIN "wiki" w
        ON w."id" = d."wikiId"
        WHERE w."hidden" = false
        ORDER BY d."datetime" DESC
        LIMIT 10
    `)
    await this.cacheManager.set(id, result, { ttl: 900 })
    return result
  }

  async initiateEmailSend(
    pending: Notification[],
    loop?: boolean,
  ): Promise<void> {
    if (pending.length === 0 && loop) {
      await new Promise((r) => setTimeout(r, SLEEP_TIME_QUERY))
      const newNotifications = await this.getPedingNotifications()

      console.log(
        '📨 Running EmailSend on Loop, checking for new notifications! 📨',
      )
      await this.initiateEmailSend(newNotifications, loop)
    }

    for (const update of pending) {
      const notificationRepository = this.dataSource.getRepository(Notification)
      const wikiRepository = this.dataSource.getRepository(Wiki)
      const userRepository = this.dataSource.getRepository(UserProfile)
      const wiki = await wikiRepository.findOneOrFail({
        where: { id: update.auxId },
      })
      const users = await this.getUsersSubscribed(update.auxId)
      const moreWikis = await this.getMoreWikis()

      await notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ pending: false })
        .where(update)
        .execute()

      for (const user of users) {
        const random = this.randomWikis(4, moreWikis, wiki.id)
        const userProfile = await userRepository.findOne({
          where: { id: ILike(user.userId) },
        })
        if (userProfile?.email) {
          try {
            const status = await this.mailer.sendIqUpdate(
              userProfile.email as string,
              wiki.id,
              wiki.title,
              wiki.images[0].id,
              random,
            )
            if (status) {
              console.log('✅ Notification sent! ')
            }

            await new Promise((r) => setTimeout(r, SLEEP_TIME))
          } catch (ex) {
            console.error(ex)
          }
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
