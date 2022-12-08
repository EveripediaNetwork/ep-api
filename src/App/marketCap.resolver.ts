/* eslint-disable import/no-cycle */
import { UseInterceptors } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Field,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql'
import MarketCapService, {
  MarketRankData,
  NftRankListData,
  TokenRankListData,
} from './marketCap.service'
import SentryInterceptor from '../sentry/security.interceptor'
import PaginationArgs from './pagination.args'

export enum RankType {
  NFT = 'nfts',
  TOKEN = 'cryptocurrencies',
}

registerEnumType(RankType, {
  name: 'RankType',
})

@ArgsType()
export class MarketCapInputs extends PaginationArgs {
  @Field(() => RankType, { defaultValue: RankType.TOKEN })
  kind?: RankType
}

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
