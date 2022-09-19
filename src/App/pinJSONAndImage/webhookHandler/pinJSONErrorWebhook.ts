import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { promises as fss } from 'fs'
import { ValidWiki } from '../../../Indexer/Store/store.service'

export interface WikiWebhookError {
  errorMessage: string
  data: ValidWiki
}

@Injectable()
export default class PinJSONErrorWebhook {
  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private makeid(length: number) {
    let result = ''
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
  }

  async postException(errorMessage: string, data: ValidWiki) {
    const webhook =
      this.configService.get<string>('DISCORD_CHANNEL_WEBHOOK') || ''
    const boundary = this.makeid(10)

    await fss.writeFile(
      `./uploads/message.json`,
      `${JSON.stringify(data, null, 2)}`,
    )
    const readText = await fss.readFile(`./uploads/message.json`)

    const jsonContent = JSON.stringify({
      username: 'EP Alarm',
      embeds: [
        {
          color: 0xcf2323,
          title: `${errorMessage} on Wiki, ID: - ${data.id}`,
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
}
