import { UseInterceptors } from '@nestjs/common'
import { Args, Query, Resolver } from '@nestjs/graphql'
import SentryInterceptor from '../../sentry/security.interceptor'
import {
  MarketCapInputs,
  MarketRankData,
  NftRankListData,
  TokenRankListData,
} from './maketcap.dto'
import MarketCapService from './marketCap.service'

@UseInterceptors(SentryInterceptor)
@Resolver(() => MarketRankData)
class MarketCapResolver {
  constructor(private marketCapService: MarketCapService) {}

  @Query(() => [MarketRankData], { nullable: 'items' })
  async rankList(
    @Args() args: MarketCapInputs,
  ): Promise<NftRankListData | TokenRankListData> {
    return this.marketCapService.ranks(args)
  }
}

export default MarketCapResolver
