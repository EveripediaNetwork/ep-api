/* eslint-disable import/no-cycle */
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { promises as fss } from 'fs'
import { FlagWikiWebhook } from '../flaggingSystem/flagWiki.service'

import { WikiWebhookError } from '../pinJSONAndImage/webhookHandler/pinJSONErrorWebhook'

enum ChannelTypes {
  FLAG_WIKI = 'flagwiki',
  PINJSON_ERROR = 'pinJSON',
}

@Injectable()
export default class WebhookHandler {
  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private getWebhookUrls() {
    const webhooks =
      this.configService.get<string>('DISCORD_CHANNEL_WEBHOOKS') || ''
    const { BRAINDAO_ALARMS, INTERNAL_ACTIVITY } = JSON.parse(webhooks)
    return { BRAINDAO_ALARMS, INTERNAL_ACTIVITY }
  }

  private makeId(length: number) {
    let result = ''
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
  }

  private async embedWebhook(
    channelType: ChannelTypes,
    flagWiki?: FlagWikiWebhook,
    wikiException?: WikiWebhookError,
  ) {
    if (channelType === ChannelTypes.FLAG_WIKI) {
      const webhook = this.getWebhookUrls().INTERNAL_ACTIVITY

      const boundary = this.makeId(10)
      const jsonContent = JSON.stringify({
        username: 'EP Report',
        embeds: [
          {
            color: 0xff9900,
            title: `Report on Wiki - ${flagWiki?.report}`,
            description:
              "In March 2022, ApeCoin DAO launched its own token separate from Yuga Labs known as ApeCoin. On October 31, 2021, the Bored Ape Yacht Club project's team held its first annual Ape Fest. The fest began in New York City and saw Bored Ape holders worldwide. The first event, APED NYC, at Bright Moments Gallery alone saw around 700 participants lined up outside the gallery",
            footer: {
              text: 'Flagged by user',
            },
          },
        ],
      })
      const content =
        `--${boundary}\n` +
        `Content-Disposition: form-data; name="payload_json"\n\n` +
        `${jsonContent}\n` +
        `--${boundary}\n` +
        `Content-Disposition: form-data; name="tts" \n\n` +
        `true\n` +
        `--${boundary}--`

      this.httpService
        .post(webhook, content, {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
        })
        .toPromise()
    }
    if (channelType === ChannelTypes.PINJSON_ERROR) {
      const webhook = this.getWebhookUrls().BRAINDAO_ALARMS
      const boundary = this.makeId(10)

      await fss.writeFile(
        `./uploads/message.json`,
        `${JSON.stringify(wikiException?.data, null, 2)}`,
      )
      const readText = await fss.readFile(`./uploads/message.json`)

      const jsonContent = JSON.stringify({
        username: 'EP Alarm',
        embeds: [
          {
            color: 0xcf2323,
            title: `${wikiException?.errorMessage} on Wiki, ID: - ${wikiException?.data.id}`,
          },
        ],
        attachments: [
          {
            id: 0,
            filename: 'message.json',
          },
        ],
      })

      const content =
        `--${boundary}\n` +
        `Content-Disposition: form-data; name="payload_json"\n` +
        `Content-Type: application/json\n\n` +
        `${jsonContent}\n` +
        `--${boundary}\n` +
        `Content-Disposition: form-data; name="files[0]"; filename="message.json"\n` +
        `Content-Type: application/json\n\n` +
        `${readText} \n` +
        `--${boundary}--`

      this.httpService
        .post(webhook, content, {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
        })
        .subscribe({
          complete: async () => {
            await fss.unlink(`./uploads/message.json`)
          },
          error: async err => {
            await fss.unlink(`./uploads/message.json`)
            console.log(err.response)
          },
        })
    }
    return true
  }

  async postWebhook(
    flagWiki?: FlagWikiWebhook,
    wikiException?: WikiWebhookError,
  ): Promise<any> {
    if (flagWiki) {
      return this.embedWebhook(ChannelTypes.FLAG_WIKI, flagWiki)
    }
    if (wikiException) {
      return this.embedWebhook(
        ChannelTypes.PINJSON_ERROR,
        // wikiException,
      )
    }
    return true
  }
}
