/* eslint-disable import/no-cycle */
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Connection } from 'typeorm'
import ContentFeedback from '../../Database/Entities/contentFeedback.entity'
import WebhookHandler, { ActionTypes } from '../utils/discordWebhookHandler'

export interface ContentFeedbackWebhook {
  wikiId: string
  userId?: string
  choice: boolean
}

interface ContentStoreObject extends ContentFeedbackWebhook {
  ip: string
}

@Injectable()
class ContentFeedbackService {
  constructor(
    private connection: Connection,
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async postFeedback(data: ContentFeedbackWebhook, ip: string) {
    const checkFeedback = await this.storeFeedback({
      ip,
      wikiId: data.wikiId,
      choice: data.choice,
      userId: data.userId as string,
    })

    if (checkFeedback) {
      await this.webhookHandler.postWebhook(
        ActionTypes.CONTENT_FEEDBACK,
        undefined,
        undefined,
        undefined,
        data,
      )
    }
    return checkFeedback
  }

  async storeFeedback(args: ContentStoreObject): Promise<boolean> {
    const repository = this.connection.getRepository(ContentFeedback)
    const id = `${args.ip}-${args.wikiId}`
    const cached: string | undefined = await this.cacheManager.get(id)

    const feedback = await repository.findOne({
      where: { wikiId: args.wikiId, ip: args.ip },
    })

    if (cached || feedback?.choice === args.choice) {
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
}

export default ContentFeedbackService
