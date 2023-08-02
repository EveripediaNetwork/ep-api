import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common'
import { Response } from 'express'
import BrainPassRepository from './brainPass.repository'
import BrainPassService from './brainPass.service'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'
import { AlchemyWebhookType } from '../../ExternalServices/alchemyNotify.dto'

@Controller('brainpass')
class BrainPassController {
  constructor(
    private brainPassRepository: BrainPassRepository,
    private brainPassService: BrainPassService,
    private alchemyNotifyService: AlchemyNotifyService,
  ) {}

  @Get(':id.json')
  async getBrainPass(@Param('id') id: number, @Res() res: Response) {
    const data = await this.brainPassRepository.findBrainPass(id)

    const metadata = await this.brainPassService.getPinataData(
      data?.metadataHash as string,
    )

    res.setHeader('Content-Type', 'application/json')

    res.send(JSON.stringify(metadata))
  }

  @Post('/nft-events')
  async initiateNFTWebhookEvent(
    @Req() request: any,
    @Res() res: Response,
    @Body() value: any,
  ) {
    return this.alchemyNotifyService.initiateWebhookEvent(
      { request, res, value },
      AlchemyWebhookType.NFT,
      async () => {
        await this.brainPassService.storeMintData(
          value.event.data.block.logs[0],
        )
      },
    )
  }
}
export default BrainPassController
