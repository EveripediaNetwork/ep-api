import { Args, Query, Resolver } from '@nestjs/graphql'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderRepository from './hiIQHolder.repository'
import HiIQHolderArgs from './hiIQHolders.dto'



@Resolver(() => HiIQHolder)
class HiIQHoldersResolver {
  constructor(private hiIQHoldersRepository: HiIQHolderRepository) {}

  @Query(() => [HiIQHolder], { name: 'hiIQHolders' })
  async hiIQHolders(@Args() args: HiIQHolderArgs) {
    return this.hiIQHoldersRepository.getHiIQHoldersCount(args)
  }
}

export default HiIQHoldersResolver
