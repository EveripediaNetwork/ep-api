/* eslint-disable new-cap */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { ValidatorCodes, Wiki as WikiType } from '@everipedia/iq-utils'
import pinataSDK, { PinataMetadata } from '@pinata/sdk'
import IpfsHash from './model/ipfsHash'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import USER_ACTIVITY_LIMIT from '../../globalVars'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import ActivityService from '../Activities/activity.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import { ActionTypes, WebhookPayload } from '../utils/utilTypes'
import SecurityTestingService from '../utils/securityTester'

@Injectable()
class PinService {
  constructor(
    private configService: ConfigService,
    private activityService: ActivityService,
    private validator: IPFSValidatorService,
    private testSecurity: SecurityTestingService,
    private metadataChanges: MetadataChangesService,
    private readonly pinJSONErrorWebhook: WebhookHandler,
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
    ) => this.pinata().pinFileToIPFS(data, option as unknown as PinataMetadata)

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

    const isContentSecure = await this.testSecurity.checkContent(data)

    if (!isDataValid.status || !isContentSecure.status) {
      const errorMessage = !isDataValid.status
        ? isDataValid.message
        : isContentSecure.message

      this.pinJSONErrorWebhook.postWebhook(ActionTypes.PINJSON_ERROR, {
        title: errorMessage,
        content: data,
      } as unknown as WebhookPayload)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: errorMessage,
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
    const pinToPinata = async (wikiContent: typeof payload) =>
      this.pinata().pinJSONToIPFS(wikiContent)

    try {
      const res = await pinToPinata(payload)

      return res
    } catch (e) {
      return e
    }
  }
}

export default PinService
