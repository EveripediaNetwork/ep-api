/* eslint-disable @typescript-eslint/no-var-requires */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { promises as fss } from 'fs'
import { HttpService } from '@nestjs/axios'
import { ValidatorCodes } from '../../Database/Entities/types/IWiki'
import IpfsHash from './model/ipfsHash'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import ActivityService from '../activity.service'
import USER_ACTIVITY_LIMIT from '../../globalVars'
import { ValidWiki } from '../../Indexer/Store/store.service'

const pinataSDK = require('@pinata/sdk')

@Injectable()
class PinService {
  constructor(
    private configService: ConfigService,
    private activityService: ActivityService,
    private validator: IPFSValidatorService,
    private readonly httpService: HttpService,
  ) {}

  
  private pinata() {
    const key = this.configService.get<string>('IPFS_PINATA_KEY')
    const secret = this.configService.get<string>('IPFS_PINATA_SECRET')

    return pinataSDK(key, secret)
  }

  async pinImage(file: fs.PathLike): Promise<IpfsHash | any> {
    const readableStreamForFile = fs.createReadStream(file)

    const pinImageToPinata = async (option: typeof readableStreamForFile) =>
      this.pinata().pinFileToIPFS(option)

    try {
      const res = await pinImageToPinata(readableStreamForFile)
      return res
    } catch (e) {
      return e
    }
  }

  async pinJSON(
    body: string,
    context: any,
  ): Promise<IpfsHash | any> {
    const data: ValidWiki = JSON.parse(body)
    const isDataValid = await this.validator.validate(data, true)
    console.log(context.hostname)
    const webhook = this.configService.get<string>('TEST_CHANNEL_WEBHOOK') || ''
    function makeid(length: number) {
      let result = ''
      const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      const charactersLength = characters.length
      for (let i = 0; i < length; i += 1) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength),
        )
      }
      return result
    }
    await fss.writeFile(
      `./uploads/message.json`,
      `${JSON.stringify(data, null, 2)}`,
    )
    const readText = await fss.readFile(`./uploads/message.json`)

    if (!isDataValid.status) {
      const boundary = makeid(10)
      const jsonContent = JSON.stringify({
        username: 'EP Alarm',
        embeds: [
          {
            color: 0xcf2323,
            title: `${isDataValid.message} on Wiki, ID: - ${data.id}`,
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
        .post(
          webhook,
          content,

          {
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
          },
        )
        .subscribe({
          complete: async () => {
            await fss.unlink(`./uploads/message.json`)
            console.log('completed')
          },
          error: async err => {
            await fss.unlink(`./uploads/message.json`)
            console.log(err.response)
          },
        })
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: isDataValid.message,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const activityResult = await this.activityService.countUserActivity(
      data.user.id,
      72,
    )

    if (activityResult > USER_ACTIVITY_LIMIT) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: ValidatorCodes.GLOBAL_RATE_LIMIT,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const payload = {
      pinataMetadata: {
        name: data.content !== undefined ? data.title : 'image',
      },
      pinataContent: {
        ...data,
      },
    }
    const pinToPinata = async (option: typeof payload) =>
      this.pinata().pinJSONToIPFS(option)

    try {
      const res = await pinToPinata(payload)

      return res
    } catch (e) {
      return e
    }
  }
}

export default PinService
