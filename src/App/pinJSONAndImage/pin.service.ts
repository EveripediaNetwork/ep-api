/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-var-requires */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { ValidatorCodes, Wiki as WikiType } from '@everipedia/iq-utils'
import IpfsHash from './model/ipfsHash'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import ActivityService from '../activity.service'
import USER_ACTIVITY_LIMIT from '../../globalVars'
import PinJSONErrorWebhook from './webhookHandler/pinJSONErrorWebhook'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'

const pinataSDK = require('@pinata/sdk')

@Injectable()
class PinService {
  constructor(
    private configService: ConfigService,
    private activityService: ActivityService,
    private validator: IPFSValidatorService,
    private metadataChanges: MetadataChangesService,
    private readonly pinJSONErrorWebhook: PinJSONErrorWebhook,
  ) {}

  private pinata() {
    const key = this.configService.get<string>('IPFS_PINATA_KEY')
    const secret = this.configService.get<string>('IPFS_PINATA_SECRET')
    const sdk = new pinataSDK(key, secret)
    return sdk
  }

  async pinImage(file: fs.PathLike): Promise<IpfsHash | any> {
    const readableStreamForFile = fs.createReadStream(file)

    const options = {
      pinataMetadata: {
        name: 'wiki-image',
      },
      pinataOptions: {
        cidVersion: 0,
      },
    }

    const pinImageToPinata = async (
      data: typeof readableStreamForFile,
      option: typeof options,
    ) => this.pinata().pinFileToIPFS(data, option)

    try {
      const res = await pinImageToPinata(readableStreamForFile, options)
      return res
    } catch (e) {
      return e
    }
  }

  async pinJSON(body: string): Promise<IpfsHash | any> {
    const wiki: WikiType = JSON.parse(body)
    const data = await this.metadataChanges.removeEditMetadata(wiki)

    const isDataValid = await this.validator.validate(data, true)

    const options = {
      pinataMetadata: {
        name: 'wiki-content',
      },
      pinataOptions: {
        cidVersion: 0,
      },
    }

    if (!isDataValid.status) {
      this.pinJSONErrorWebhook.postException(isDataValid.message, data)
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
    const pinToPinata = async (wikiContent: typeof payload, option: typeof options) =>
      this.pinata().pinJSONToIPFS(wikiContent, option)

    try {
      const res = await pinToPinata(payload, options)

      return res
    } catch (e) {
      return e
    }
  }
}

export default PinService
