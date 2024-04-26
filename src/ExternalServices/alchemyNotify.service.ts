import { HttpStatus, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { ethers } from 'ethers'
import {
  AlchemyWebhookType,
  TxData,
  ABIdecodeType,
  EventRequestData,
} from './alchemyNotify.dto'

@Injectable()
class AlchemyNotifyService {
  constructor(private configService: ConfigService) {}

  private getSigningKey(webhookType: string) {
    return this.configService.get<string>(webhookType)
  }

  async isValidSignatureForStringBody(
    body: string,
    signature: string,
    type: AlchemyWebhookType,
  ): Promise<boolean> {
    const key = this.getSigningKey(type) as string
    let validation = false

    if (!key) {
      return validation
    }

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
  ): Promise<ethers.LogDescription | null> {
    let decoded = null
    try {
      const iface = new ethers.Interface(abi)
    //   const iface = new ethers.utils.Interface(abi)
      decoded = iface.parseLog(log)
    } catch (e: any) {
      console.error('Error decoding log', e)
    }
    return decoded
  }

  async initiateWebhookEvent(
    requestData: EventRequestData,
    type: AlchemyWebhookType,
    callback: () => Promise<void>,
  ) {
    const { request, res, value } = requestData
    if (!value || !value.event) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ status: HttpStatus.NOT_FOUND, message: 'No data' })
    }

    const signature = request.headers['x-alchemy-signature']
    const checkSignature = await this.isValidSignatureForStringBody(
      JSON.stringify(value),
      signature,
      type,
    )

    if (!checkSignature) {
      console.error('Signature failed for', type)
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: HttpStatus.BAD_REQUEST, signature: 'invalid' })
    }

    await callback()

    return res.json({ status: HttpStatus.OK, signature: 'valid' })
  }
}

export default AlchemyNotifyService
