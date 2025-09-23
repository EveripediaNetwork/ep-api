import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from '@openzeppelin/defender-relay-client/lib/ethers'
import { ethers, Signer } from 'ethers'
import { ConfigService } from '@nestjs/config'
import { catchError, firstValueFrom } from 'rxjs'
import { HttpService } from '@nestjs/axios'
import { AxiosError } from 'axios'
import WikiAbi from '../utils/wiki.abi'
import { USER_ACTIVITY_LIMIT } from '../../globalVars'
import ActivityRepository from '../../App/Activities/activity.repository'
import AppService from '../../App/app.service'
import WebhookHandler from '../../App/utils/discordWebhookHandler'
import { ActionTypes, WebhookPayload } from '../../App/utils/utilTypes'

@Injectable()
class RelayerService {
  private readonly logger = new Logger(RelayerService.name)

  private signer: any

  private wikiInstance: any

  constructor(
    private appService: AppService,
    private configService: ConfigService,
    private httpService: HttpService,
    private activityRepository: ActivityRepository,
    private readonly discordWebhook: WebhookHandler,
  ) {
    this.signer = this.getRelayerInstance()
    this.wikiInstance = this.getWikiContractInstance(this.signer)
  }

  public getRelayerInstance() {
    const credentials = {
      apiKey: this.configService.get('RELAYER_API_KEY'),
      apiSecret: this.configService.get('RELAYER_API_SECRET'),
    }
    const PRIVATE_RPC = this.configService.get<string>(
      'CUSTOM_RELAYER_RPC',
    ) as string
    const PRIVATE_KEY = this.configService.get<string>(
      'CUSTOM_RELAYER_SIGNER',
    ) as string
    const rpcProvider = new ethers.providers.JsonRpcProvider(PRIVATE_RPC)
    const relayerProvider = new DefenderRelayProvider(credentials)

    const signer =
      this.appService.apiLevel() !== 'prod' || this.appService.privateSigner()
        ? new ethers.Wallet(PRIVATE_KEY, rpcProvider)
        : new DefenderRelaySigner(credentials, relayerProvider, {
            speed: 'fast',
          })

    return signer
  }

  private getWikiContractInstance(signer: Signer) {
    return new ethers.Contract(
      this.configService.get('WIKI_CONTRACT_ADDRESS') || '',
      WikiAbi,
      signer,
    )
  }

  async getMaticGas(): Promise<string | null> {
    const KEY = this.configService.get<string>('ETHERSCAN_API_KEY') as string
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(
            `https://api.etherscan.io/v2/api?chainid=137&module=gastracker&action=gasoracle&apikey=${KEY}`,
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(error?.response?.data)
              throw new Error(
                'An error occurred while fetching matic gas price',
              )
            }),
          ),
      )

      const fastGasPrice = data.result.FastGasPrice
      const numericGasPrice = Number(fastGasPrice)
      if (!Number.isNaN(numericGasPrice)) {
        return numericGasPrice <= 40 ? '60' : fastGasPrice
      }
      this.discordWebhook.postWebhook(ActionTypes.GAS_PRICE_ERROR, {
        title: 'GAS PRICE ERROR',
        description: 'Unable to evaluate gas price',
        content: data.result,
      } as unknown as WebhookPayload)
      throw new Error('Invalid gas price format')
    } catch (error) {
      this.discordWebhook.postWebhook(ActionTypes.GAS_PRICE_ERROR, {
        title: 'GAS PRICE ERROR',
        description: 'Error fetching GasPrice',
        content: error,
      } as unknown as WebhookPayload)
      this.logger.error('Error fetching GasPrice', error)
      return null
    }
  }

  async getUpdatedGas(increaseBy = 1.5) {
    const maticGas = (await this.getMaticGas()) || '60'
    const gasBump = String(Math.round(parseInt(maticGas, 10) * increaseBy))
    return gasBump
  }

  public async relayTx(
    ipfs: string,
    userAddr: string,
    deadline: number,
    v: string,
    r: string,
    s: string,
    isRetry = false,
  ): Promise<any> {
    if (!isRetry) {
      const activityCount = await this.activityRepository.countUserActivity(
        userAddr,
        72,
      )
      if (activityCount > USER_ACTIVITY_LIMIT) {
        throw new HttpException(
          {
            status: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too many requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    try {
      let result
      if (this.appService.apiLevel() !== 'prod') {
        const txConfig = {
          gasPrice: ethers.utils.parseUnits('0.7', 'gwei'),
        }
        result = await this.wikiInstance.postBySig(
          ipfs,
          userAddr,
          deadline,
          v,
          r,
          s,
          txConfig,
        )
      } else {
        const gasBumpMultiplier = isRetry ? 2.0 : 1.7
        const gas = await this.getUpdatedGas(gasBumpMultiplier)

        const txConfig = this.appService.privateSigner()
          ? {
              gasPrice: ethers.utils.parseUnits(gas, 'gwei'),
              gasLimit: 50000,
            }
          : {
              gasLimit: 50000,
            }

        result = await this.wikiInstance.postBySig(
          ipfs,
          userAddr,
          deadline,
          v,
          r,
          s,
          txConfig,
        )
      }
      return result
    } catch (error: any) {
      if (!isRetry && error.code === 'REPLACEMENT_UNDERPRICED') {
        return this.relayTx(ipfs, userAddr, deadline, v, r, s, true)
      }
      throw error
    }
  }
}

export default RelayerService
