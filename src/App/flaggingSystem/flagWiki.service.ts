import { Injectable } from '@nestjs/common'
import {
  ActionTypes,
  FlagWikiWebhook,
  WebhookPayload,
} from '../utils/utilTypes'
import WebhookHandler from '../utils/discordWebhookHandler'

@Injectable()
class FlagWikiService {
  constructor(private webhookHandler: WebhookHandler) {}

  async flagWiki(data: FlagWikiWebhook) {
    await this.webhookHandler.postWebhook(ActionTypes.FLAG_WIKI, {
      user: data.userId,
      description: data.report,
      urlId: data.wikiId,
    } as WebhookPayload)
    return true
  }
}

export default FlagWikiService
