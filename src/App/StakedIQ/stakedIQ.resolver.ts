import { Args, Query, Resolver } from '@nestjs/graphql'
import { DateArgs } from '../Wiki/wikiStats.dto'
import StakedIQ from '../../Database/Entities/stakedIQ.entity'
import StakedIQRepository from './stakedIQ.repository'

@Resolver(() => StakedIQ)
class StakedIQResolver {
  constructor(private stakedIQRepository: StakedIQRepository) {}

  @Query(() => [StakedIQ], { name: 'dailyStakedIQ' })
  async dailyStakedIQ(@Args() args: DateArgs) {
    return this.stakedIQRepository.getDailyStakedIQ(args)
  }
}

export default StakedIQResolver
