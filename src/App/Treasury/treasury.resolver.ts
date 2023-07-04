import { Args, Query, Resolver } from '@nestjs/graphql'
import Treasury from '../../Database/Entities/treasury.entity'
import TreasuryRepository from './treasury.repository'
import { DateArgs } from '../Wiki/wikiStats.dto'

@Resolver(() => Treasury)
class TreasuryResolver {
  constructor(private treasuryRepository: TreasuryRepository) {}

  @Query(() => [Treasury], { name: 'dailyTreasury' })
  async dailyTreasury(@Args() args: DateArgs) {
    return this.treasuryRepository.getDailyTreasuryValue(args)
  }
}

export default TreasuryResolver
