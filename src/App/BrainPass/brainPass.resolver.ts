/* eslint-disable no-console */
import { Args, Query, Resolver } from '@nestjs/graphql'
import BrainPassRepository from './brainPass.repository'
import BrainPass from '../../Database/Entities/brainPass.entity'
import { BrainPassArgs } from './brainPass.dto'

@Resolver()
class BrainPassResolver {
  constructor(private brainPassRepository: BrainPassRepository) {}

  @Query(() => [BrainPass], { name: 'retrieveBrainPass' })
  async retrieveBrainPass(@Args() args: BrainPassArgs) {
    return this.brainPassRepository.getBrainPassByAddress(args)
  }
}

export default BrainPassResolver
