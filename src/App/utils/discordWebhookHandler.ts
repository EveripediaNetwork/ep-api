/* eslint-disable @typescript-eslint/no-unused-expressions */
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { promises as fss } from 'fs'
import { Wiki as WikiType } from '@everipedia/iq-utils'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import {
  ActionTypes,
  AdminLogPayload,
  AdminMutations,
  ContentStoreObject,
  FlagWikiWebhook,
  WikiWebhookError,
} from './utilTypes'

@Injectable()
export default class WebhookHandler {
  constructor(
    private dataSourece: DataSource,
    private configService: ConfigService,
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
    actionType: ActionTypes,
    flagWiki?: FlagWikiWebhook,
    wikiException?: WikiWebhookError,
    adminLog?: AdminLogPayload,
    contentStoreObject?: ContentStoreObject,
  ) {
    const boundary = this.makeId(10)
    const internalActivity = this.getWebhookUrls().INTERNAL_ACTIVITY
    const braindaoAlarms = this.getWebhookUrls().BRAINDAO_ALARMS
    const wikiRepo = this.dataSourece.getRepository(Wiki)
    const userProfileRepo = this.dataSourece.getRepository(UserProfile)

    if (actionType === ActionTypes.ADMIN_ACTION) {
      const user = await userProfileRepo.findOne({
        where: { id: `LOWER(id) = '${adminLog?.address.toLowerCase()}'` },
      })

      let adminUser

      if (!user) {
        adminUser = adminLog?.address
      } else {
        adminUser = user.username
      }

      let message
      switch (adminLog?.endpoint) {
        case AdminMutations.HIDE_WIKI: {
          message = `**Wiki archived** - ${this.getWebpageUrl()}/wiki/${
            adminLog?.id
          } 🔒 \n\n _Performed by_ ***${adminUser}***`
          break
        }
        case AdminMutations.UNHIDE_WIKI: {
          message = `**Wiki unarchived** - ${this.getWebpageUrl()}/wiki/${
            adminLog?.id
          } 🔓 \n\n _Performed by_ ***${adminUser}***`
          break
        }
        case AdminMutations.PROMOTE_WIKI: {
          message = `**Wiki promoted** - ${this.getWebpageUrl()}/wiki/${
            adminLog?.id
          }  📌 \n\n _Performed by_ ***${adminUser}***`
          break
        }
        case AdminMutations.REVALIDATE_PAGE: {
          message = `**Route revalidated** - ${this.getWebpageUrl()}${
            adminLog?.id
          }  ♻️ \n\n _Performed by_ ***${adminUser}*** `
          break
        }
        case AdminMutations.TOGGLE_USER_STATE: {
          adminLog?.status === true
            ? (message = `**User unbanned** - ${this.getWebpageUrl()}/account/${
                adminLog?.id
              }  ✅ \n\n _Performed by_ ***${adminUser}*** `)
            : (message = `**User banned** - ${this.getWebpageUrl()}/account/${
                adminLog?.id
              } ❌ \n\n _Performed by_ ***${adminUser}*** `)
          break
        }
        default:
          message = ''
      }

      const jsonContent = JSON.stringify({
        username: 'EP Admin 🔐',
        embeds: [
          {
            color: 0x0c71e0,
            title: `🚧  Admin activity  🚧`,
            description: message,
          },
        ],
      })
      await this.sendToChannel(boundary, jsonContent, braindaoAlarms)
    }
    if (actionType === ActionTypes.FLAG_WIKI) {
      const user = await userProfileRepo.findOneBy({
        id: flagWiki?.userId,
      })

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
      await this.sendToChannel(boundary, jsonContent, internalActivity)
    }
    if (actionType === ActionTypes.PINJSON_ERROR) {
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
        .post(braindaoAlarms, content, {
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
    if (actionType === ActionTypes.CONTENT_FEEDBACK) {
      const wiki = await wikiRepo.find({
        select: ['title'],
        where: {
          id: contentStoreObject?.wikiId,
          hidden: false,
        },
      })
      let user

      if (contentStoreObject && !contentStoreObject.userId) {
        const a = contentStoreObject.ip.split('.')
        user = `${a[0]}.${a[1]}.${a[2]}.*`
      } else {
        const userProfile = await userProfileRepo.findOneBy({
          id: contentStoreObject?.userId,
        })
        user = userProfile?.username || 'anonymous'
      }

      const jsonContent = JSON.stringify({
        username: 'EP feedback',
        embeds: [
          {
            color: contentStoreObject?.choice ? 0x6beb34 : 0xeb6234,
            title: `${contentStoreObject?.choice ? '👍' : '👎'}  ${
              wiki.length !== 0 ? wiki[0].title : 'invalid title'
            }`,
            url: `${this.getWebpageUrl()}/wiki/${contentStoreObject?.wikiId}`,
            description: `${user} ${
              contentStoreObject?.choice ? 'finds' : 'does not find'
            } this wiki interesting`,
            footer: {
              text: `IQ.wiki feedback`,
            },
          },
        ],
      })

      await this.sendToChannel(boundary, jsonContent, internalActivity)
    }

    return true
  }

  private async sendToChannel(
    boundary: string,
    content: string,
    wehhookChannel: string,
  ): Promise<void> {
    const payload =
      `--${boundary}\n` +
      `Content-Disposition: form-data; name="payload_json"\n\n` +
      `${content}\n` +
      `--${boundary}\n` +
      `Content-Disposition: form-data; name="tts" \n\n` +
      `true\n` +
      `--${boundary}--`

    this.httpService
      .post(wehhookChannel, payload, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
      })
      .toPromise()
  }

  async postWebhook(
    actionType: ActionTypes,
    flagWiki?: FlagWikiWebhook,
    wikiException?: WikiWebhookError,
    adminLog?: AdminLogPayload,
    contentStoreObject?: ContentStoreObject,
  ) {
    if (flagWiki) {
      return this.embedWebhook(actionType, flagWiki)
    }
    if (wikiException) {
      return this.embedWebhook(actionType, undefined, wikiException)
    }
    if (adminLog) {
      return this.embedWebhook(actionType, undefined, undefined, adminLog)
    }
    if (contentStoreObject) {
      return this.embedWebhook(
        actionType,
        undefined,
        undefined,
        undefined,
        contentStoreObject,
      )
    }
    return true
  }

  async postPinJSONException(errorMessage: string, data: WikiType) {
    return this.postWebhook(ActionTypes.PINJSON_ERROR, undefined, {
      errorMessage,
      data,
    })
  }
}
