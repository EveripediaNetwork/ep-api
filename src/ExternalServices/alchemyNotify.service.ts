import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { ethers } from 'ethers'

export type ABIdecodeType = Array<{
  anonymous: boolean
  inputs: Array<{
    indexed: boolean
    internalType: string
    name: string
    type: string
  }>
  name: string
  type: string
}>

export type TxData = {
  account: { address: string }
  data: string
  topics: string[]
  index: number
}

export enum WebhookType {
  WIKI = 'ALCHEMY_NOTIFY_WIKI_SIGNING_KEY',
  NFT = 'ALCHEMY_NOTIFY_NFT_SIGNING_KEY',
}

@Injectable()
class AlchemyNotifyService {
  constructor(private configService: ConfigService) {}

  private getSigningKey(webhookType: string) {
    return this.configService.get<string>(webhookType)
  }

  async isValidSignatureForStringBody(
    body: string,
    signature: string,
    type: WebhookType,
  ): Promise<boolean> {
    const key = this.getSigningKey(type) as string
    let validation = false
    try {
      const hmac = crypto.createHmac('sha256', key)
      hmac.update(body, 'utf8')
      const digest = hmac.digest('hex')

      validation = signature === digest
    } catch (e) {
      console.error(e)
    }
    return validation
  }

  async decodeLog(
    log: TxData,
    abi: ABIdecodeType,
  ): Promise<ethers.utils.LogDescription | null> {
    let decoded = null
    try {
      const iface = new ethers.utils.Interface(abi)
      decoded = iface.parseLog(log)
    } catch (e: any) {
      console.error('Error decoding log', e)
    }
    return decoded
  }
}

export default AlchemyNotifyService
