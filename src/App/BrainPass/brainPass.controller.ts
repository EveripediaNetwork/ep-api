import { Body, Controller, Get, HttpStatus, Param, Post, Req, Res } from '@nestjs/common'
import { Response } from 'express'
import BrainPassRepository from './brainPass.repository'
import BrainPassService from './brainPass.service'

@Controller('brainpass')
class BrainPassController {
  constructor(
    private brainPassRepository: BrainPassRepository,
    private brainPassService: BrainPassService,
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
  async initiateWebhookEvent(
    @Req() request: any,
    @Res() res: Response,
    @Body() value: any,
  ) {
    const signature = request.headers['x-alchemy-signature']
    const checkSignature = await this.brainPassService.isValidSignatureForStringBody(
      JSON.stringify(value),
      signature,
    )
    if (!checkSignature) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: HttpStatus.BAD_REQUEST, indexing: false })
    }
    await this.brainPassService.storeMintEvent(value)
    return res.json({ status: HttpStatus.OK, indexing: true })
  }
}
export default BrainPassController
