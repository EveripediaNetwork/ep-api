import { Args, Query, Resolver } from '@nestjs/graphql'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderArgs from './hiIQHolders.dto'
import HiIQHolderService from './hiIQHolder.service'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import { OrderArgs } from '../pagination.args'

@Resolver(() => HiIQHolder)
class HiIQHoldersResolver {
  constructor(private hiIQHoldersService: HiIQHolderService) {}

  @Query(() => [HiIQHolder], { name: 'hiIQHolders' })
  async hiIQHolders(@Args() args: HiIQHolderArgs) {
    return this.hiIQHoldersService.getHiIQHoldersCount(args)
  }

  @Query(() => [HiIQHolderAddress], { name: 'hiIQHoldersRank' })
  async hiIQHoldersRank(@Args() args: OrderArgs) {
    return this.hiIQHoldersService.hiIQHoldersRank(args)
  }
}

export default HiIQHoldersResolver
