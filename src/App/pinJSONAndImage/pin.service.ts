/* eslint-disable new-cap */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { ValidatorCodes, Wiki as WikiType } from '@everipedia/iq-utils'
import IpfsHash from './model/ipfsHash'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import USER_ACTIVITY_LIMIT from '../../globalVars'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import { ActionTypes, WebhookPayload } from '../utils/utilTypes'
import SecurityTestingService from '../utils/securityTester'
import ActivityRepository from '../Activities/activity.repository'
import PinataService from '../../ExternalServices/pinata.service'

const contentCheckDate = 1699269216 // 6/11/23
@Injectable()
class PinService {
  constructor(
    private activityRepository: ActivityRepository,
    private pinataService: PinataService,
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
    ) => this.pinataService.getPinataInstance().pinFileToIPFS(data, option)

    try {
      const res = await pinImageToPinata(readableStreamForFile, options)
      return res
    } catch (error) {
      console.error('Media Error:', error)
      return { error: 'Media Error' }
    }
  }

  async pinJSON(body: string): Promise<IpfsHash | any> {
    console.log('Received JSON body:', body)

    try {
      const wikiObject: WikiType = JSON.parse(body)
      const wikiData = await this.metadataChanges.removeEditMetadata(wikiObject)
      const isTimeoutError = (
        error: unknown,
      ): error is NodeJS.ErrnoException => {
        return (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ETIMEOUT'
        )
      }

      const isDataValid = await this.validator.validate(wikiData, true)

      let isContentSecure

      const wikiDate = wikiObject.created
        ? Math.floor(new Date(wikiObject.created).getTime() / 1000)
        : null

      if (!wikiObject.created) {
        isContentSecure = await this.testSecurity.checkContent(wikiData)
      }

      if (
        !isDataValid ||
        !isDataValid.status ||
        (isContentSecure && !isContentSecure.status)
      ) {
        const errorMessage = !isDataValid.status
          ? isDataValid.message
          : isContentSecure?.message

        this.pinJSONErrorWebhook.postWebhook(ActionTypes.PINJSON_ERROR, {
          title: errorMessage,
          description: isContentSecure?.match,
          content:
            (!isContentSecure?.status || !isDataValid.status) && wikiData,
        } as unknown as WebhookPayload)

        if (isTimeoutError(errorMessage)) {
          console.error('API Timeout:', errorMessage)
          return { error: 'API Timeout' }
        }

        if ((errorMessage as string).startsWith('SyntaxError:')) {
          console.error('JSON Parsing Error:', errorMessage)
          return { error: 'Invalid JSON Format' }
        }

        console.error('Media Error:', errorMessage)
        return { error: 'Media Error' }
      }

      if (wikiDate && wikiDate > contentCheckDate) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Invalid wiki date',
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      const activityResult = await this.activityRepository.countUserActivity(
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

      const payload = {
        pinataMetadata: {
          name: wikiData.content !== undefined ? wikiData.title : 'image',
        },
        pinataContent: {
          ...wikiData,
        },
      }

      const pinToPinata = async (wikiContent: typeof payload) =>
        this.pinataService.getPinataInstance().pinJSONToIPFS(wikiContent)

      const res = await pinToPinata(payload)
      return res
    } catch (error) {
      console.error('Unexpected Error:', error)
      return { error: 'Unexpected Error' }
    }
  }
}

export default PinService
