/* eslint-disable import/no-cycle */
import { Injectable } from '@nestjs/common'
import { ValidWiki } from '../../../Indexer/Store/store.service'
import WebhookHandler, { ChannelTypes } from '../../utils/discordWebhookHandler'

export interface WikiWebhookError {
  errorMessage: string
  data: ValidWiki
}

@Injectable()
export default class PinJSONErrorWebhook {
  constructor(private webhookHandler: WebhookHandler) {}

  async postException(errorMessage: string, data: ValidWiki) {
    return this.webhookHandler.postWebhook(ChannelTypes.PINJSON_ERROR, undefined, {
      errorMessage,
      data,
    })
  }
}
