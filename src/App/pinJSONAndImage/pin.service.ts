/* eslint-disable new-cap */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { ValidatorCodes, Wiki as WikiType } from '@everipedia/iq-utils'
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import IpfsHash from './model/ipfsHash'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import USER_ACTIVITY_LIMIT from '../../globalVars'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import { ActionTypes, WebhookPayload } from '../utils/utilTypes'
import SecurityTestingService from '../utils/securityTester'
import ActivityRepository from '../Activities/activity.repository'
import PinataService from '../../ExternalServices/pinata.service'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'
import { RankType } from '../marketCap/marketcap.dto'

interface CgApiIdList {
  id: string
  symbol: string
  name: string
}

const contentCheckDate = 1699269216 // 6/11/23
@Injectable()
class PinService {
  private CG_API_KEY: string

  constructor(
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    private pinateService: PinataService,
    private validator: IPFSValidatorService,
    private testSecurity: SecurityTestingService,
    private activityRepository: ActivityRepository,
    private metadataChanges: MetadataChangesService,
    private readonly pinJSONErrorWebhook: WebhookHandler,
  ) {
    this.CG_API_KEY = this.configService.get('COINGECKO_API_KEY') as string
  }

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
    const wiki: WikiType = JSON.parse(body)

    const { wikiObject, saveMatchedIdcallback } =
      await this.handleCoingekoApiId(wiki)

    const wikiData = await this.metadataChanges.removeEditMetadata(wikiObject)

    const isDataValid = await this.validator.validate(wikiData, true)

    let isContentSecure

    const wikiDate = wikiObject.created
      ? Math.floor(new Date(wikiObject.created).getTime() / 1000)
      : null

    if (!wikiObject.created) {
      isContentSecure = await this.testSecurity.checkContent(wikiData)
    }

    if (!isDataValid.status || (isContentSecure && !isContentSecure.status)) {
      const errorMessage = !isDataValid.status
        ? isDataValid.message
        : isContentSecure?.message

      this.pinJSONErrorWebhook.postWebhook(ActionTypes.PINJSON_ERROR, {
        title: errorMessage,
        description: isContentSecure?.match,
        content: (!isContentSecure?.status || !isDataValid.status) && wikiData,
      } as unknown as WebhookPayload)
      if (wikiDate && wikiDate > contentCheckDate) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        )
      }
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
      this.pinateService.getPinataInstance().pinJSONToIPFS(wikiContent)

    try {
      const res = await pinToPinata(payload)
      await saveMatchedIdcallback()
      return res
    } catch (e) {
      return e
    }
  }

  async handleCoingekoApiId(wiki: WikiType): Promise<{
    wikiObject: WikiType
    saveMatchedIdcallback: () => Promise<void | MarketCapIds>
  }> {
    const coingeckoProfileMetadata = wiki.metadata.find(
      (e) => e.id === 'coingecko_profile',
    )

    if (!coingeckoProfileMetadata) {
      return { wikiObject: wiki, saveMatchedIdcallback: async () => {} }
    }

    const coingeckoUrl = coingeckoProfileMetadata.value as string

    const marketCapIdRepo = this.dataSource.getRepository(MarketCapIds)
    const marketCapId = await marketCapIdRepo.findOneBy({ wikiId: wiki.id })

    if (!marketCapId || !marketCapId.linked) {
      const apiId = await this.getCgApiId(coingeckoUrl)
      const coingeckoApiId = await marketCapIdRepo.findOneBy({
        wikiId: wiki.id,
      })

      if (!apiId || coingeckoApiId) {
        return { wikiObject: wiki, saveMatchedIdcallback: async () => {} }
      }

      const index = wiki.metadata.findIndex(
        (item) => item.id === 'coingecko_profile',
      )

      if (index !== -1) {
        const newWiki = { ...wiki }
        newWiki.metadata[
          index
        ].value = `https://www.coingecko.com/en/coins/${apiId}`
        console.info('wiki id', wiki.id, '🔗', 'coingecko api Id', apiId)
        const saveMatchedIdcallback = async () => {
          const matchedId = marketCapIdRepo.create({
            wikiId: wiki.id,
            coingeckoId: apiId,
            kind: RankType.TOKEN,
            linked: false,
          })
          await marketCapIdRepo.save(matchedId)
        }

        return {
          wikiObject: newWiki,
          saveMatchedIdcallback,
        }
      }
    }

    return { wikiObject: wiki, saveMatchedIdcallback: async () => {} }
  }

  async getCgApiId(url: string): Promise<string> {
    let apiId
    try {
      const response = await this.httpService
        .get(
          'https://pro-api.coingecko.com/api/v3/coins/list?include_platform=false',
          {
            headers: {
              'x-cg-pro-api-key': this.CG_API_KEY,
            },
          },
        )
        .toPromise()

      const coinsList: CgApiIdList[] = response?.data
      const urlSplit = url.split('/')
      const slugId = urlSplit[5]
      for (const coin of coinsList) {
        if (
          (!slugId.includes('-') &&
            coin.name.toLowerCase() === slugId.toLowerCase()) ||
          coin.name.split(' ').join('-').toLowerCase() ===
            slugId.toLowerCase() ||
          slugId === coin.id
        ) {
          apiId = coin.id
          console.log(apiId)
          break
        }
      }
    } catch (error) {
      console.error('Error fetching coingecko api id for wiki')
    }
    return apiId as string
  }
}

export default PinService
