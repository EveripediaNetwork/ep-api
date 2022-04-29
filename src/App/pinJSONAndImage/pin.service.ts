/* eslint-disable @typescript-eslint/no-var-requires */
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import IpfsHash from './model/ipfsHash'
import ActivityService from '../activity.service'

const pinataSDK = require('@pinata/sdk')

@Injectable()
class PinService {
  constructor(
    private configService: ConfigService,
    private activityService: ActivityService,
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

  async pinJSON(body: string): Promise<IpfsHash | any> {
    const data = JSON.parse(`${body}`)

    await this.activityService.checkUserActivity(data.user.id)

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
