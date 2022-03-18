import { Injectable } from '@nestjs/common'
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from 'defender-relay-client/lib/ethers'
import { ethers, Signer } from 'ethers'
import { ConfigService } from '@nestjs/config'
import WikiAbi from '../utils/wiki.abi'

@Injectable()
class RelayerService {
  private signer: any

  private wikiInstance: any

  constructor(private configService: ConfigService) {
    this.signer = this.getRelayerInstance()
    this.wikiInstance = this.getWikiContractInstance(this.signer)
  }

  private getRelayerInstance() {
    const credentials = {
      apiKey: this.configService.get('API_KEY'),
      apiSecret: this.configService.get('API_SECRET'),
    }
    const provider = new DefenderRelayProvider(credentials)
    const signer = new DefenderRelaySigner(credentials, provider, {
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
    const result = await this.wikiInstance.postBySig(
      ipfs,
      userAddr,
      deadline,
      v,
      r,
      s,
    )
    return result
  }
}

export default RelayerService
