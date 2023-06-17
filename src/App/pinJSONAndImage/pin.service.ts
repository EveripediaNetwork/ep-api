/* eslint-disable new-cap */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { ValidatorCodes, Wiki as WikiType } from '@everipedia/iq-utils'
import IpfsHash from './model/ipfsHash'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import USER_ACTIVITY_LIMIT from '../../globalVars'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import ActivityService from '../Activities/activity.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import { ActionTypes, WebhookPayload } from '../utils/utilTypes'
import SecurityTestingService from '../utils/securityTester'
import PinataService from '../../ExternalServices/pinata.service'

@Injectable()
class PinService {
  constructor(
    private pinateService: PinataService,
    private activityService: ActivityService,
    private validator: IPFSValidatorService,
    private testSecurity: SecurityTestingService,
    private metadataChanges: MetadataChangesService,
    private readonly pinJSONErrorWebhook: WebhookHandler,
  ) {}


  async pinImage(file: fs.PathLike): Promise<IpfsHash | any> {
    const readableStreamForFile = fs.createReadStream(file)

    const options = {
      pinataMetadata: {
        name: 'wiki-image',
      },
    }

    const pinImageToPinata = async (
      data: typeof readableStreamForFile,
      option: typeof options,
    ) => this.pinateService.getPinataInstance().pinFileToIPFS(data, option)

    try {
      const res = await pinImageToPinata(readableStreamForFile, options)
      return res
    } catch (e) {
      return e
    }
  }

  async pinJSON(body: string): Promise<IpfsHash | any> {
    const wikiObject: WikiType = JSON.parse(body)
    const wikiData = await this.metadataChanges.removeEditMetadata(wikiObject)

    const isDataValid = await this.validator.validate(wikiData, true)
    const isContentSecure = await this.testSecurity.checkContent(wikiData)

    if (!isDataValid.status || !isContentSecure.status) {
      const errorMessage = !isDataValid.status
        ? isDataValid.message
        : isContentSecure.message

      this.pinJSONErrorWebhook.postWebhook(ActionTypes.PINJSON_ERROR, {
        title: errorMessage,
        description: isContentSecure?.match,
        content: !isContentSecure.status ? isContentSecure.data : wikiData,
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
      wikiData.user.id,
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
    const c: WikiType = isContentSecure.data
    const payload = {
      pinataMetadata: {
        name: c.content !== undefined ? isContentSecure.data.title : 'image',
      },
      pinataContent: {
        ...isContentSecure.data,
      },
    }
    const pinToPinata = async (wikiContent: typeof payload) =>
      this.pinateService.getPinataInstance().pinJSONToIPFS(wikiContent)

    try {
      const res = await pinToPinata(payload)

      return res
    } catch (e) {
      return e
    }
  }
}

export default PinService
