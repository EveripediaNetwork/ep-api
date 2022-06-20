import { UseInterceptors } from '@nestjs/common'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import SentryInterceptor from '../../sentry/security.interceptor'

import RelayerService from '../services/relayer.service'
import SignaturePayloadInput from './dto/signaturePayload.dto'
import Relayer from './models/relayer'

@UseInterceptors(SentryInterceptor)
@Resolver()
class RelayerResolver {
  constructor(private relayerService: RelayerService) {}

  @Mutation(() => Relayer, { name: 'relayer' })
  async relay(
    @Args({ name: 'txToRelay', type: () => SignaturePayloadInput })
    txToRelay: SignaturePayloadInput,
  ) {
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
export default RelayerResolver
