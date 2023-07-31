import { Controller, Post, Req, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import IndexerWebhookService from '../services/indexerWebhook.service'
import AlchemyNotifyService from '../../../ExternalServices/alchemyNotify.service'
import {
  AlchemyWebhookType,
  EventData,
} from '../../../ExternalServices/alchemyNotify.dto'

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
    return this.alchemyNotifyService.initiateWebhookEvent(
      { request, res, value },
      AlchemyWebhookType.WIKI,
      async () => {
        await this.service.indexWebhook(value.event.data.block)
      },
    )
  }
}
export default IndexerWebhookController
