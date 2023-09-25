import { Args, Query, Resolver } from '@nestjs/graphql'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import IQHolderRepository from './IQHolder.repository'
import IQHolderArgs from './IQHolders.dto'
import IQHolderService from './IQHolder.service'
import { IntervalByDays, IntervalByType } from '../utils/queryHelpers'

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
    @Args("interval") interval: IntervalByDays,
    @Args("limit") limit: number,
    @Args("start", { nullable: true}) start: Date,
    @Args("end", { nullable: true}) end: Date,
  ): Promise<IQHolder[]> {
    return this.iqHolderService.getIQHoldersWithArgs(args)
  }
}

export default IQHoldersResolver
