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
import { Connection } from 'typeorm'
import SentryInterceptor from '../sentry/security.interceptor'
import MarketCapService from './marketCap.service'
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
@Resolver(() => [])
class MarketCapResolver {
  constructor(
    private connection: Connection,
    private marketCapService: MarketCapService,
  ) {}

  // TODO: Implement return type wiki + mcap
  @Query(() => Boolean)
  async rankList(@Args() args: MarketCapInputs) {
    // const repository = this.connection.getRepository(Wiki)
    const res = await this.marketCapService.ranks(args)

    // console.log(res)
    return res
  }
}

export default MarketCapResolver
