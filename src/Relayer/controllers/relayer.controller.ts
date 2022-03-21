import { Body, Controller, Post } from '@nestjs/common'

import RelayerService from '../services/relayer.service'

interface SignaturePayload {
  ipfs: string
  userAddr: string
  deadline: number
  v: string
  r: string
  s: string
}

@Controller('relayer')
class RelayerController {
  constructor(private relayerService: RelayerService) {}

  @Post()
  async relay(@Body() txToRelay: SignaturePayload) {
    return this.relayerService.relayTx(
      txToRelay.ipfs,
      txToRelay.userAddr,
      txToRelay.deadline,
      txToRelay.v,
      txToRelay.r,
      txToRelay.s,
    )
  }
}
export default RelayerController
