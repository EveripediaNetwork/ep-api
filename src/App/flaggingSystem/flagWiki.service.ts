/* eslint-disable import/no-cycle */
import { Injectable } from '@nestjs/common'
import WebhookHandler, { ChannelTypes } from '../utils/discordWebhookHandler'

export interface FlagWikiWebhook {
  report: string
  wikiId: string
  userId: string
}

@Injectable()
class FlagWikiService {
  constructor(private webhookHandler: WebhookHandler) {}

  async flagWiki(data: FlagWikiWebhook) {
    await this.webhookHandler.postWebhook(ChannelTypes.FLAG_WIKI, data)
    return true
  }
}

export default FlagWikiService
