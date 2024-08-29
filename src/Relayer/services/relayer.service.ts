import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
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
import USER_ACTIVITY_LIMIT from '../../globalVars'
import ActivityRepository from '../../App/Activities/activity.repository'
import AppService from '../../App/app.service'

@Injectable()
class RelayerService {
  private signer: any

  private wikiInstance: any

  constructor(
    private appService: AppService,
    private configService: ConfigService,
    private httpService: HttpService,
    private activityRepository: ActivityRepository,
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

    const signerUsed = Object.keys(signer)[Object.keys(signer).length - 1]
    console.log(signerUsed !== 'relayer' ? 'PRIVATE SIGNER' : 'RELAYER SIGNER')
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
    const KEY = this.configService.get<string>('POLYGONSCAN_API_KEY') as string
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(
            `https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=${KEY}`,
          )
          .pipe(
            catchError((error: AxiosError) => {
              console.error(error?.response?.data)
              throw new Error(
                'An error occurred while fetching matic gas price',
              )
            }),
          ),
      )

      const fastGasPrice = data.result.FastGasPrice
      return fastGasPrice
    } catch (error) {
      console.error('Error in getGasPrice', error)
      return null
    }
  }

  async getUpdatedGas() {
    const maticGas = (await this.getMaticGas()) || '40'

    const gasBump = parseInt(maticGas, 10) * 1000 * 1.2

    return gasBump
  }

  public async relayTx(
    ipfs: string,
    userAddr: string,
    deadline: number,
    v: string,
    r: string,
    s: string,
  ) {
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
      const gas = await this.getUpdatedGas()

      const txConfig = this.appService.privateSigner()
        ? {
            gasPrice: gas,
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
  }
}

export default RelayerService
