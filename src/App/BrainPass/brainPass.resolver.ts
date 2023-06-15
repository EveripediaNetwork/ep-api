/* eslint-disable no-console */
import { Args, Query, Resolver } from '@nestjs/graphql'
import BrainPassRepository from './brainPass.repository'
import BrainPass from '../../Database/Entities/brainPass.entity'

@Resolver()
class BrainPassResolver {
  constructor(private brainPassRepository: BrainPassRepository) {}

  @Query(() => [BrainPass], { name: 'retrieveBrainPass' })
  async retrieveBrainPass(
    @Args('address', { type: () => String }) address: string,
  ) {
    return this.brainPassRepository.getBrainPassByAddress(address)
  }

//   @Mutation(() => BrainPass, { name: 'storeBrainPass' })
//   async storeBrainPass(
//     @Args({ name: 'data', type: () => String })
//     data: string,
//   ) {
//     const mintData = JSON.parse(data)
//     return this.brainPassRepository.createBrainPass(mintData)
//   }
}

export default BrainPassResolver
