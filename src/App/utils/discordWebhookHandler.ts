/* eslint-disable import/no-cycle */
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { promises as fss } from 'fs'
import { Connection } from 'typeorm'
import { AdminMutations } from './adminLogs.interceptor'
import UserProfile from '../../Database/Entities/userProfile.entity'
import { FlagWikiWebhook } from '../flaggingSystem/flagWiki.service'
import { WikiWebhookError } from '../pinJSONAndImage/webhookHandler/pinJSONErrorWebhook'
import { AdminLogPayload } from './adminLogs.interceptor'

export enum ChannelTypes {
  FLAG_WIKI = 'flagwiki',
  PINJSON_ERROR = 'pinJSON',
  ADMIN_ACTION = 'adminAction',
}

@Injectable()
export default class WebhookHandler {
  constructor(
    private configService: ConfigService,
    private connection: Connection,
    private readonly httpService: HttpService,
  ) {}

  private getWebhookUrls() {
    const webhooks =
      this.configService.get<string>('DISCORD_CHANNEL_WEBHOOKS') || ''
    const { BRAINDAO_ALARMS, INTERNAL_ACTIVITY } = JSON.parse(webhooks)
    return { BRAINDAO_ALARMS, INTERNAL_ACTIVITY }
  }

  private getWebpageUrl() {
    return this.configService.get<string>('WEBSITE_URL') || ''
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
    adminLog?: AdminLogPayload,
  ) {
    if (channelType === ChannelTypes.ADMIN_ACTION) {
      const webhook = this.getWebhookUrls().BRAINDAO_ALARMS
      let message
      switch (adminLog?.endpoint) {
        case AdminMutations.HIDE_WIKI: {
          message = `${adminLog?.address} hides ${adminLog?.id}`
          break
        }
        case AdminMutations.UNHIDE_WIKI: {
          message = `${adminLog?.address} unhides ${adminLog?.id}`
          break
        }
        case AdminMutations.PROMOTE_WIKI: {
          message = `${
            adminLog?.address
          } promoted ${this.getWebpageUrl()}wiki/${adminLog?.id}`
          break
        }
        case AdminMutations.REVALIDATE_PAGE: {
          message = `${adminLog?.address} revalidated route - ${adminLog?.id}`
          break
        }
        default:
            message = ''
      }

      const boundary = this.makeId(10)
      const jsonContent = JSON.stringify({
        username: 'EP Admin 🔐',
        embeds: [
          {
            color: 0x0c71e0,
            title: `🚧  Admin activity  🚧`,
            // url: `${this.getWebpageUrl()}/wiki/${flagWiki?.wikiId}`,
            description: message,
            // footer: {
            //   text: `Flagged by ${user?.username || 'user'}`,
            // },
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
    if (channelType === ChannelTypes.FLAG_WIKI) {
      const webhook = this.getWebhookUrls().INTERNAL_ACTIVITY
      const repository = this.connection.getRepository(UserProfile)
      const user = await repository.findOne(flagWiki?.userId)

      const boundary = this.makeId(10)
      const jsonContent = JSON.stringify({
        username: 'EP Report',
        embeds: [
          {
            color: 0xff9900,
            title: `📢   Wiki report on ${flagWiki?.wikiId}  📢`,
            url: `${this.getWebpageUrl()}wiki/${flagWiki?.wikiId}`,
            description: `${flagWiki?.report}`,
            footer: {
              text: `Flagged by ${user?.username || 'user'}`,
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
    channelType: ChannelTypes,
    flagWiki?: FlagWikiWebhook,
    wikiException?: WikiWebhookError,
    adminLog?: AdminLogPayload,
  ) {
    if (flagWiki) {
      return this.embedWebhook(channelType, flagWiki)
    }
    if (wikiException) {
      return this.embedWebhook(channelType, undefined, wikiException)
    }
    if (adminLog) {
      return this.embedWebhook(channelType, undefined, undefined, adminLog)
    }
    return true
  }
}
