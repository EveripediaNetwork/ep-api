/* eslint-disable @typescript-eslint/naming-convention */
import { Controller, HttpStatus, Post, Req, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { ethers } from 'ethers'

const decodeABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: '_ipfs',
        type: 'string',
      },
    ],
    name: 'Posted',
    type: 'event',
  },
]

@Controller('indexer')
class IndexerWebhookController {
  constructor(private configService: ConfigService) {}

  private signingKey() {
    return this.configService.get<string>('WEBHOOK_SIGNNING_KEY')
  }

  @Post()
  async initiateStore(
    @Req() request: any,
    @Res() res: Response,
    @Body() value: any,
  ) {
    const signature = request.headers['x-alchemy-signature']
    const key = this.signingKey()
    const validateRequest = await this.isValidSignatureForStringBody(
      JSON.stringify(value),
      signature,
      key,
    )

    if (validateRequest) {
      const { logs } = value.event.data.block
      await this.decodeLogs(logs)
      return res.status(HttpStatus.OK).json({ valid: true })
    }
    return res.status(HttpStatus.BAD_REQUEST).json({ valid: false })
  }

  async isValidSignatureForStringBody(
    body: string,
    signature: string,
    signingKey = 'whsec_test',
  ): Promise<boolean> {
    const hmac = crypto.createHmac('sha256', signingKey)
    hmac.update(body, 'utf8')
    const digest = hmac.digest('hex')

    return signature === digest
  }

  async decodeLogs(logs: any[]) {
    const iface = new ethers.utils.Interface(decodeABI)

    if (logs.length === 0) {
      return false
    }

    logs.forEach((log) => {
      log.logs.forEach((e: { topics: string[]; data: string }) =>
        iface.parseLog(e),
      )
    })
    return true
  }
}
export default IndexerWebhookController
