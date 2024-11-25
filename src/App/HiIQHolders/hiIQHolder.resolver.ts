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
    return this.hiIQHoldersService.getHiIQHoldersGraph(args)
  }

  @Query(() => [HiIQHolder], { name: 'hiIQHoldersCount' })
  async hiIQHoldersCount() {
    return this.hiIQHoldersService.getHiIQHoldersCount()
  }

  @Query(() => [HiIQHolderAddress], { name: 'hiIQHoldersRank' })
  async hiIQHoldersRank(@Args() args: OrderArgs) {
    return this.hiIQHoldersService.hiIQHoldersRank(args)
  }

  @Query(() => HiIQHolderAddress, { name: 'searchHiIQHolder', nullable: true })
  async searchHiIQHolderAddress(@Args('address') address: string) {
    return this.hiIQHoldersService.searchHiIQHolderAddress(address)
  }
}

export default HiIQHoldersResolver
