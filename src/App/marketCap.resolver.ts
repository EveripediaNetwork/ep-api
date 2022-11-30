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
import MarketCapService, { RankListData } from './marketCap.service'
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
@Resolver(() => RankListData)
class MarketCapResolver {
  constructor(
    private marketCapService: MarketCapService,
  ) {}

  @Query(() => [RankListData])
  async rankList(@Args() args: MarketCapInputs) {
    return this.marketCapService.ranks(args)
  }
}

export default MarketCapResolver
