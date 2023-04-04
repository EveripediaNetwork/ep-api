import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { DataSource } from 'typeorm'
import ContentFeedback from '../../Database/Entities/contentFeedback.entity'
import {
  ActionTypes,
  ContentFeedbackWebhook,
  ContentStoreObject,
  IQSocialFeedbackWebhook,
  WebhookPayload,
} from '../utils/utilTypes'
import WebhookHandler from '../utils/discordWebhookHandler'

@Injectable()
class ContentFeedbackService {
  constructor(
    private dataSource: DataSource,
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async postWikiFeedback(data: ContentFeedbackWebhook, ip: string) {
    const waitIP = await this.checkIP(ip)

    if (!waitIP) {
      return waitIP
    }

    const checkFeedback = await this.storeFeedback({
      ip,
      wikiId: data.wikiId as string,
      choice: data.choice as boolean,
      userId: data.userId as string,
    })

    if (checkFeedback) {
      await this.webhookHandler.postWebhook(
        ActionTypes.CONTENT_FEEDBACK,
        {
          ip,
          urlId: data.wikiId,
          choice: data.choice,
          user: data.userId
        } as WebhookPayload,
      )
    }
    return checkFeedback
  }

  async postSocialFeedback(data: IQSocialFeedbackWebhook) {
    await this.webhookHandler.postWebhook(
      ActionTypes.CONTENT_FEEDBACK,
      {
        title: data.reportType,
        description: data.message
      } as WebhookPayload,
    )
  }

  async storeFeedback(args: ContentStoreObject): Promise<boolean> {
    const repository = this.dataSource.getRepository(ContentFeedback)
    const id = `${args.ip}-${args.wikiId}`
    const cached: string | undefined = await this.cacheManager.get(id)

    const feedback = await repository.findOne({
      where: { wikiId: args.wikiId, ip: args.ip },
    })

    if (cached || (feedback && feedback.choice === args.choice)) {
      return false
    }

    if (feedback && feedback.choice !== args.choice) {
      await repository.query(
        `UPDATE content_feedback SET choice = $1 where "wikiId" = $2 AND ip = $3`,
        [args.choice, args.wikiId, args.ip],
      )
    }

    if (!feedback) {
      const newFeedback = repository.create({
        ...args,
      })
      await repository.save(newFeedback)
    }
    await this.cacheManager.set(id, args.ip)
    return true
  }

  async checkIP(ip: string): Promise<boolean> {
    const cached: string | undefined = await this.cacheManager.get(ip)
    if (!cached) {
      await this.cacheManager.set(ip, ip, { ttl: 180 })
      return true
    }
    return false
  }
}

export default ContentFeedbackService
