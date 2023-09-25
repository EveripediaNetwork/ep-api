import { Args, Query, Resolver } from '@nestjs/graphql'
import Treasury from '../../Database/Entities/treasury.entity'
import TreasuryRepository from './treasury.repository'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { DailyTreasuryArgs } from './treasury.dto'

@Resolver(() => Treasury)
class TreasuryResolver {
  constructor(private treasuryRepository: TreasuryRepository) {}

  @Query(() => [Treasury], { name: 'dailyTreasury' })
  async dailyTreasury(
    @Args() args: DailyTreasuryArgs,
  ): Promise<Treasury[]> {
    const dateArgs: DateArgs = {
      startDate: args.start ? args.start.getTime() : 0,
      endDate: args.end ? args.end.getTime() : Date.now(),
    }
    return this.treasuryRepository.getDailyTreasuryValue(dateArgs)
  }
}

export default TreasuryResolver
