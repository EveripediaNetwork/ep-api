import { Query, Resolver } from '@nestjs/graphql'
import Treasury from '../../Database/Entities/treasury.entity'
import TreasuryRepository from './treasury.repository'



@Resolver(() => Treasury)
class TreasuryResolver {
  constructor(private treasuryRepository: TreasuryRepository) {}

  @Query(() => [Treasury], { name: 'dailyTreasury' })
  async dailyTreasury() {
//   async dailyTreasury(@Args() args: any) {
    return this.treasuryRepository.getDailyTreasuryValue()
  }
}

export default TreasuryResolver
