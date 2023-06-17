import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import { Response } from 'express'
import BrainPassRepository from './brainPass.repository'
import BrainPassService from './brainPass.service'
import AlchemyNotifyService, {
  WebhookType,
} from '../../ExternalServices/alchemyNotify.service'

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

  @Post('/events')
  async initiateNFTWebhookEvent(
    @Req() request: any,
    @Res() res: Response,
    @Body() value: any,
  ) {
    if (value.event.data.block.logs.length !== 0) {
      return true
    }
    const signature = request.headers['x-alchemy-signature']
    const checkSignature =
      await this.alchemyNotifyService.isValidSignatureForStringBody(
        JSON.stringify(value),
        signature,
        WebhookType.NFT,
      )
    if (!checkSignature) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: HttpStatus.BAD_REQUEST, signature: 'invalid' })
    }
    await this.brainPassService.storeMintData(value.event.data.block.logs[0])
    return res.json({ status: HttpStatus.OK, signature: 'valid' })
  }
}
export default BrainPassController
