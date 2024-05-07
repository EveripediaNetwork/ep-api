import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from '@openzeppelin/defender-relay-client/lib/ethers'
import { ethers, JsonRpcProvider, Signer } from 'ethers'
import { ConfigService } from '@nestjs/config'
import WikiAbi from '../utils/wiki.abi'
import USER_ACTIVITY_LIMIT from '../../globalVars'
import ActivityRepository from '../../App/Activities/activity.repository'

@Injectable()
class RelayerService {
  private signer: any

  private environment: string

  private wikiInstance: any

  constructor(
    private configService: ConfigService,
    private activityRepository: ActivityRepository,
  ) {
    this.signer = this.getRelayerInstance()
    this.wikiInstance = this.getWikiContractInstance(this.signer)
    this.environment = process.env.API_LEVEL as string
  }

  private getRelayerInstance() {
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
    const rpcProvider = new JsonRpcProvider(PRIVATE_RPC)
    const relayerProvider = new DefenderRelayProvider(credentials)

    const signer =
      this.environment !== 'prod'
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
    let txConfig

    if (this.environment !== 'prod') {
      txConfig = {
        gasPrice: ethers.parseUnits('0.7', 'gwei'),
      }
    } else {
      txConfig = {
        gasLimit: ethers.parseUnits('50000', 'gwei'),
      }
    }

    const result = await this.wikiInstance.postBySig(
      ipfs,
      userAddr,
      deadline,
      v,
      r,
      s,
      txConfig,
    )
    return result
  }
}

export default RelayerService
