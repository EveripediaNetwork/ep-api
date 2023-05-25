import { Controller, HttpStatus, Post, Req, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

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
    @Body() value: string,
  ) {
    const signature = request.headers['x-alchemy-signature']
    const key = this.signingKey()
    const validateRequest = await this.isValidSignatureForStringBody(
      JSON.stringify(value),
      signature,
      key
    )

    if (validateRequest) {
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
}
export default IndexerWebhookController
