import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import {
  MarketCapInputs,
  MarketRankData,
  NftRankListData,
  RankPageIdInputs,
  TokenRankListData,
} from './marketcap.dto'
import MarketCapService from './marketCap.service'

@Resolver(() => MarketRankData)
class MarketCapResolver {
  constructor(private marketCapService: MarketCapService) {}

  @Query(() => [MarketRankData], { nullable: 'items' })
  async rankList(
    @Args() args: MarketCapInputs,
  ): Promise<NftRankListData | TokenRankListData> {
    return this.marketCapService.ranks(args)
  }

  @Mutation(() => Boolean )
  async rankPageIds(
    @Args() args: RankPageIdInputs,
  ): Promise<boolean> {
    return this.marketCapService.updateMistachIds(args)
  }
}

export default MarketCapResolver
