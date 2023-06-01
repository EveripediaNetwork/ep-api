import { Controller, HttpStatus, Post, Req, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import IndexerWebhookService from '../services/indexerWebhook.service'
import { EventData } from '../indexerWehhook.dto'

@Controller('indexer')
class IndexerWebhookController {
  constructor(private service: IndexerWebhookService) {}

  @Post()
  async initiateWebhookStore(
    @Req() request: any,
    @Res() res: Response,
    @Body() value: EventData,
  ) {
    const signature = request.headers['x-alchemy-signature']
    const checkSignature = await this.service.isValidSignatureForStringBody(
      JSON.stringify(value),
      signature,
    )
    if (!checkSignature) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: HttpStatus.BAD_REQUEST, indexing: false })
    }
    await this.service.indexWebhook(value.event.data.block)
    return res.json({ status: HttpStatus.OK, indexing: true })
  }
}
export default IndexerWebhookController
