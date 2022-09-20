/* eslint-disable import/no-cycle */
import { Injectable } from '@nestjs/common'
import WebhookHandler from '../utils/discordWebhookHandler'

export interface FlagWikiWebhook {
  report: string
  wikiId: string
  userId: string
}

@Injectable()
class FlagWikiService {
  constructor(private webhookHandler: WebhookHandler) {}

  async flagWiki(report: string, wikiId: string, userId: string) {
    console.log(report, wikiId, userId)
    await this.webhookHandler.postWebhook({
      report,
      wikiId,
      userId,
    })
    return true
  }
}

export default FlagWikiService
