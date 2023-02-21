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

@Injectable()
class ContentFeedbackService {
  constructor(
    private connection: Connection,
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async postFeedback(data: ContentFeedbackWebhook, ip: string) {
    const checkFeedback = await this.storeFeedback(
      ip,
      data.wikiId,
      data.choice,
      data.userId as string,
    )

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

  async storeFeedback(
    ip: string,
    wikiId: string,
    choice: boolean,
    userId: string,
  ): Promise<boolean> {
    const repository = this.connection.getRepository(ContentFeedback)
    const id = `${ip}-${wikiId}`
    const cached: string | undefined = await this.cacheManager.get(id)
    let state

    if (cached) {
      state = false
    }

    const feedback = await repository.findOne({
      where: { wikiId, ip },
    })

    if (
      feedback?.choice !== choice &&
      feedback?.ip === ip &&
      feedback?.wikiId === wikiId
    ) {
      await repository.query(
        `UPDATE content_feedback SET choice = $1 where "wikiId" = $2 AND ip = $3`,
        [choice, wikiId, ip],
      )
      await this.cacheManager.set(id, ip)
      state = true
    }

    if (
      feedback?.choice === choice &&
      feedback?.ip === ip &&
      feedback?.wikiId === wikiId
    ) {
      state = false
    }

    if (!feedback) {
      const newFeedback = repository.create({
        wikiId,
        ip,
        choice,
        userId,
      })
      await repository.save(newFeedback)
      await this.cacheManager.set(id, ip)
      state = true
    }

    return state as boolean
  }
}

export default ContentFeedbackService
