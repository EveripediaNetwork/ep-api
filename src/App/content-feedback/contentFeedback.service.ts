/* eslint-disable import/no-cycle */
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Connection } from 'typeorm'
import ContentFeedback from '../../Database/Entities/contentFeedback.entity'
import WebhookHandler, { ActionTypes } from '../utils/discordWebhookHandler'

export interface ContentFeedbackWebhook {
  wikiId: string
  userId: string
  choice: boolean
}

interface ContentFeedbackCaptured {
  ip: string
  userId: string
  wikiId: string
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
      data.userId,
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
    return true
  }

  async storeFeedback(
    ip: string,
    wikiId: string,
    choice: boolean,
    userId: string,
  ): Promise<boolean> {
    const repository = this.connection.getRepository(ContentFeedback)
    const id = `${ip}-${wikiId}-${choice}`
    const cached: ContentFeedbackCaptured | undefined =
      await this.cacheManager.get(id)

    if (cached) {
      return false
    }

    const feedback = await repository.findOne({
      where: { wikiId, choice, ip },
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
    }

    if (
      feedback?.choice === choice &&
      feedback?.ip === ip &&
      feedback?.wikiId === wikiId
    ) {
      return true
    }

    if (!feedback) {
      const newFeedback = repository.create({
        wikiId,
        ip,
        choice,
        userId,
      })
      await repository.save(newFeedback)
    }

    return true
  }
}

export default ContentFeedbackService
