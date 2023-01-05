/* eslint-disable import/no-cycle */
import { Injectable } from '@nestjs/common'
import { Wiki as WikiType } from '@everipedia/iq-utils'
import WebhookHandler, { ActionTypes } from '../../utils/discordWebhookHandler'

export interface WikiWebhookError {
  errorMessage: string
  data: WikiType
}

@Injectable()
export default class PinJSONErrorWebhook {
  constructor(private webhookHandler: WebhookHandler) {}

  async postException(errorMessage: string, data: WikiType) {
    return this.webhookHandler.postWebhook(
      ActionTypes.PINJSON_ERROR,
      undefined,
      {
        errorMessage,
        data,
      },
    )
  }
}
