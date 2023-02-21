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
    const repository = this.connection.getRepository(ContentFeedback)

    const feedback = await repository.findOne({
      where: { wikiId: data.wikiId, choice: data.choice, ip },
    })

    if (
      feedback?.choice !== data.choice &&
      feedback?.ip === ip &&
      feedback?.wikiId === data.wikiId
    ) {
      // update choice where wikiId and ip
    }

    if (
      feedback?.choice === data.choice &&
      feedback?.ip === ip &&
      feedback?.wikiId === data.wikiId
    ) {
      //   return true
    }

    if (!feedback) {
      //   create entry
    }

    await this.webhookHandler.postWebhook(
      ActionTypes.CONTENT_FEEDBACK,
      undefined,
      undefined,
      undefined,
      data,
    )
    return true
  }

  async storeFeedback(
    ip: string,
    wikiId: string,
    choice: boolean,
  ): Promise<boolean> {
    // TODO: to be implemented
    const id = `${ip}-${wikiId}-${choice}`
    const cached: ContentFeedbackCaptured | undefined =
      await this.cacheManager.get(id)
    if (cached) {
      return false
    }
    return true
  }
}

export default ContentFeedbackService
