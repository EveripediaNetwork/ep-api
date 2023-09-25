import { Args, Query, Resolver } from '@nestjs/graphql'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import IQHolderArgs from './IQHolders.dto'
import IQHolderService from './IQHolder.service'

@Resolver(() => IQHolder)
class IQHoldersResolver {
  constructor(private iqHolderService: IQHolderService) {}

  @Query(() => [IQHolder], { name: "IQHoldersByDateRange" })
  async IQHoldersByDateRange(
    @Args("startDate") startDate: Date,
    @Args("endDate") endDate: Date,
  ): Promise<IQHolder[]> {
    return this.iqHolderService.getIQHoldersByDateRange(startDate, endDate)
  }

  @Query(() => [IQHolder], { name: 'IQHolders' })
  async IQHolders(
    @Args() args: IQHolderArgs,
  ): Promise<IQHolder[]> {
    return this.iqHolderService.getIQHoldersWithArgs(args)
  }
}

export default IQHoldersResolver
