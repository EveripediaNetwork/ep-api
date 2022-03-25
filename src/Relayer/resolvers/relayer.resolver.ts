import { Args, Mutation, Resolver } from '@nestjs/graphql'
import RelayerService from '../services/relayer.service'
import Relayer from './models/relayer'

@Resolver()
class RelayerResolver {
  constructor(private relayerService: RelayerService) {}

  @Mutation(() => Relayer, { name: 'relayer' })
  async relay(
    @Args({ name: 'txToRelay', type: () => String })
    data: string,
  ) {
    return this.relayerService.graphRelayTx(data)
  }
}
export default RelayerResolver
