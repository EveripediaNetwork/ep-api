/* eslint-disable import/no-cycle */
import { Injectable } from '@nestjs/common'
import WebhookHandler, { ActionTypes } from '../utils/discordWebhookHandler'

export interface ContentFeedbackWebhook {
  wikiId: string
  userId: string
  choice: boolean
}

@Injectable()
class ContentFeedbackService {
  constructor(private webhookHandler: WebhookHandler) {}

  async postFeedback(data: ContentFeedbackWebhook) {
    await this.webhookHandler.postWebhook(
      ActionTypes.CONTENT_FEEDBACK,
      undefined,
      undefined,
      undefined,
      data,
    )
    return true
  }

  async storeFeedback() {
    // TODO: to be implemented
    return true
  }
}

export default ContentFeedbackService
