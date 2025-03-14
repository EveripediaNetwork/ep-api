import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { promises as fss } from 'fs'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import { ActionTypes, AdminMutations, WebhookPayload } from './utilTypes'
import ContentFeedbackSite from '../../Database/Entities/types/IFeedback'

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

  private async embedWebhook(actionType: ActionTypes, payload: WebhookPayload) {
    const boundary = this.makeId(10)
    const internalActivity = this.getWebhookUrls().INTERNAL_ACTIVITY
    const braindaoAlarms = this.getWebhookUrls().BRAINDAO_ALARMS
    const wikiRepo = this.dataSourece.getRepository(Wiki)
    const userProfileRepo = this.dataSourece.getRepository(UserProfile)

    if (actionType === ActionTypes.ADMIN_ACTION) {
      const user = await userProfileRepo
        .createQueryBuilder('user_profile')
        .where('LOWER(id) = :id', { id: payload?.user?.toLowerCase() })
        .getOne()

      let adminUser

      if (!user) {
        adminUser = payload?.user
      } else {
        adminUser = user.username
      }

      let message
      switch (payload?.adminAction) {
        case AdminMutations.HIDE_WIKI: {
          message = `**Wiki archived** - ${this.getWebpageUrl()}/wiki/${
            payload?.urlId
          } 🔒 \n\n _Performed by_ ***${adminUser}***`
          break
        }
        case AdminMutations.UNHIDE_WIKI: {
          message = `**Wiki unarchived** - ${this.getWebpageUrl()}/wiki/${
            payload?.urlId
          } 🔓 \n\n _Performed by_ ***${adminUser}***`
          break
        }
        case AdminMutations.PROMOTE_WIKI: {
          message = `**Wiki promoted** - ${this.getWebpageUrl()}/wiki/${
            payload?.urlId
          }  📌 \n\n _Performed by_ ***${adminUser}***`
          break
        }
        case AdminMutations.REVALIDATE_PAGE: {
          const { urlId } = payload
          const baseUrl = this.getWebpageUrl()
          const koUrl = `${baseUrl}/ko${urlId}`
          const zhUrl = `${baseUrl}/zh${urlId}`

          message = `
            **Routes revalidated**  
            - ${baseUrl}${urlId}  ♻️ 
            - ${koUrl}  ♻️ 
            - ${zhUrl}  ♻️ 
            \n\n_Performed by_ ***${adminUser}***
            `
          break
        }
        case AdminMutations.TOGGLE_USER_STATE: {
          if (!payload?.choice) {
            message = `**User banned** - ${this.getWebpageUrl()}/account/${
              payload?.urlId
            } ❌ \n\n _Performed by_ ***${adminUser}*** `
          } else {
            message = `**User unbanned** - ${this.getWebpageUrl()}/account/${
              payload?.urlId
            }  ✅ \n\n _Performed by_ ***${adminUser}*** `
          }
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
            title: '🚧  Admin activity  🚧',
            description: message,
          },
        ],
      })
      await this.sendToChannel(boundary, jsonContent, braindaoAlarms)
    }
    if (actionType === ActionTypes.FLAG_WIKI) {
      const user = await userProfileRepo.findOneBy({
        id: payload?.user,
      })

      const jsonContent = JSON.stringify({
        username: 'EP Report',
        embeds: [
          {
            color: 0xff9900,
            title: `📢   Wiki report on ${payload?.urlId}  📢`,
            url: `${this.getWebpageUrl()}/wiki/${payload?.urlId}`,
            description: `${payload?.description}`,
            footer: {
              text: `Flagged by ${user?.username || 'user'}`,
            },
          },
        ],
      })
      await this.sendToChannel(boundary, jsonContent, braindaoAlarms)
    }
    if (actionType === ActionTypes.PINJSON_ERROR) {
      await fss.writeFile(
        './uploads/message.json',
        `${JSON.stringify(payload?.content, null, 2)}`,
      )
      const readText = await fss.readFile('./uploads/message.json')

      let embedText = ''
      if (payload?.description) {
        const descriptionJSON = JSON.stringify(payload.description, null, 2)
        embedText += '```json\n'
        embedText += `${descriptionJSON}\n`
        embedText += '```'
        embedText += '\n\n'
      }

      const jsonContent = JSON.stringify({
        username: 'EP Alarm',
        embeds: [
          {
            color: 0xcf2323,
            title: `${payload?.title} on Wiki, ID: - ${payload?.content?.id}\n\n`,
            description: embedText,
          },
        ],
        attachments: [
          {
            id: 0,
            filename: 'message.json',
          },
        ],
      })

      const content = `--${boundary}\nContent-Disposition: form-data; name="payload_json"\nContent-Type: application/json\n\n${jsonContent}\n--${boundary}\nContent-Disposition: form-data; name="files[0]"; filename="message.json"\nContent-Type: application/json\n\n${readText} \n--${boundary}--`
      try {
        this.httpService
          .post(braindaoAlarms, content, {
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
          })
          .subscribe({
            complete: async () => {
              await fss.unlink('./uploads/message.json')
            },
            error: async (err) => {
              await fss.unlink('./uploads/message.json')
              console.log(err.response)
              const errorMessage = `Request to API failed\nError code: ${
                err.response?.status
              }\nError message: ${err.response?.data?.message || err.message}`
              await this.sendToChannel(
                boundary,
                JSON.stringify({
                  content: errorMessage,
                }),
                braindaoAlarms,
              )
            },
          })
      } catch (e) {
        console.error(e)
      }
    }
    if (actionType === ActionTypes.CONTENT_FEEDBACK) {
      let jsonContent
      let user
      if (payload && !payload.user && payload.ip) {
        const a = payload.ip.split('.')
        user = `${a[0]}.${a[1]}.${a[2]}.*`
      } else {
        const userProfile = await userProfileRepo.findOneBy({
          id: payload?.user,
        })
        user = userProfile?.username || 'anonymous'
      }

      if (payload.title === ContentFeedbackSite.IQWIKI) {
        const rating = payload.rating as number
        const stars = '⭐'.repeat(rating)
        const wiki = await wikiRepo.find({
          select: ['title'],
          where: {
            id: payload?.urlId,
            hidden: false,
          },
        })
        jsonContent = JSON.stringify({
          username: 'IQ Wiki feedback',
          embeds: [
            {
              color: rating >= 3 ? 0x6beb34 : 0xeb6234,
              title: `${wiki.length !== 0 ? wiki[0].title : 'invalid title'}`,
              url: `${this.getWebpageUrl()}/wiki/${payload?.urlId}`,
              description: `${stars}\n\n ${user} rated this wiki ${rating} star${
                rating > 1 ? 's' : ''
              }`,
              footer: {
                text: 'IQ.wiki feedback',
              },
            },
          ],
        })
        await this.sendToChannel(boundary, jsonContent, braindaoAlarms)
      }

      if (payload.title === ContentFeedbackSite.IQSOCIAL) {
        jsonContent = JSON.stringify({
          username: 'IQ Social feedback',
          embeds: [
            {
              color: 0xbe185d,
              title: payload?.reportSubject,
              description: `_${payload?.description}_ \n\n ID: ${payload?.urlId}  \n\n _Reported by_ 🎤 ***${user}*** `,
            },
          ],
        })
        await this.sendToChannel(boundary, jsonContent, braindaoAlarms)
      }
    }
    if (actionType === ActionTypes.WIKI_ETH_ADDRESS) {
      let desc = ''
      let knownAddressesInfo = ''
      let unknownAddressesCount = 0
      if (payload) {
        const { knownAddresses, unknownAddresses } = payload
        unknownAddressesCount = unknownAddresses?.length || 0
        if (knownAddresses && Object.keys(knownAddresses).length > 0) {
          knownAddressesInfo = ''
          for (const [name, count] of Object.entries(knownAddresses)) {
            knownAddressesInfo += `\nName: ***${name}***, requests: ***${count}***`
          }
        }
      }
      desc = `
          ${knownAddressesInfo}
          ${
            unknownAddressesCount > 0
              ? `\nUnknown Addresses requests: ***${unknownAddressesCount}***`
              : ''
          }
        `
      const jsonContent = JSON.stringify({
        username: 'Eth address ➡️ Wiki Page',
        embeds: [
          {
            color: 0xe60dac,
            title: 'Requested wiki pages not found',
            description: desc,
          },
        ],
      })
      await this.sendToChannel(boundary, jsonContent, internalActivity)
    }
    if (actionType === ActionTypes.GAS_PRICE_ERROR) {
      const jsonContent = JSON.stringify({
        username: 'Relayer',
        embeds: [
          {
            color: 0x6212ec,
            title: payload.title,
            description: `${payload.description} \n\n${payload.content}`,
          },
        ],
      })
      await this.sendToChannel(boundary, jsonContent, braindaoAlarms)
    }
    return true
  }

  private async sendToChannel(
    boundary: string,
    content: string,
    webhookChannel: string,
  ): Promise<void> {
    const payload = `--${boundary}\nContent-Disposition: form-data; name="payload_json"\n\n${content}\n--${boundary}\nContent-Disposition: form-data; name="tts" \n\ntrue\n--${boundary}--`
    try {
      this.httpService
        .post(webhookChannel, payload, {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
        })
        .toPromise()
    } catch (e) {
      console.error(e)
    }
  }

  async postWebhook(actionType: ActionTypes, payload: WebhookPayload) {
    return this.embedWebhook(actionType, payload)
  }
}
