import { Args, Mutation, Resolver } from '@nestjs/graphql'
import ActivityService from '../../App/activity.service'

import RelayerService from '../services/relayer.service'
import SignaturePayloadInput from './dto/signaturePayload.dto'
import Relayer from './models/relayer'

@Resolver()
class RelayerResolver {
  constructor(
    private relayerService: RelayerService,
    private activityService: ActivityService,
  ) {}

  @Mutation(() => Relayer, { name: 'relayer' })
  async relay(
    @Args({ name: 'txToRelay', type: () => SignaturePayloadInput })
    txToRelay: SignaturePayloadInput,
  ) {
    const activity = await this.activityService.checkUserActivity(
      txToRelay.userAddr,
    )
    if (activity) {
      return this.relayerService.relayTx(
        txToRelay.ipfs,
        txToRelay.userAddr,
        txToRelay.deadline,
        txToRelay.v,
        txToRelay.r,
        txToRelay.s,
      )
    }
    return false
  }
}
export default RelayerResolver
