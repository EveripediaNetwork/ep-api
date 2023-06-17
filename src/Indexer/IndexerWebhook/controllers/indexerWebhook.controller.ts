import { Controller, HttpStatus, Post, Req, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import IndexerWebhookService from '../services/indexerWebhook.service'
import { EventData } from '../indexerWehhook.dto'
import AlchemyNotifyService, {
  WebhookType,
} from '../../../ExternalServices/alchemyNotify.service'

@Controller('indexer')
class IndexerWebhookController {
  constructor(
    private service: IndexerWebhookService,
    private alchemyNotifyService: AlchemyNotifyService,
  ) {}

  @Post()
  async initiateWikiWebhookEvent(
    @Req() request: any,
    @Res() res: Response,
    @Body() value: EventData,
  ) {
    const signature = request.headers['x-alchemy-signature']
    const checkSignature =
      await this.alchemyNotifyService.isValidSignatureForStringBody(
        JSON.stringify(value),
        signature,
        WebhookType.WIKI,
      )
    if (!checkSignature) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: HttpStatus.BAD_REQUEST, signature: 'invalid' })
    }
    await this.service.indexWebhook(value.event.data.block)
    return res.json({ status: HttpStatus.OK, signature: 'valid' })
  }
}
export default IndexerWebhookController
