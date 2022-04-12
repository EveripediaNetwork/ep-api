import { Args, Field, ObjectType, Query, Resolver } from '@nestjs/graphql'
import TokenStatsService from './tokenStats.service'

@ObjectType()
export class TokenData {
  @Field()
  id?: string

  @Field()
  symbol?: string

  @Field()
  name?: string

  @Field()
  image?: string

  @Field()
  current_price?: number

  @Field()
  market_cap?: number

  @Field()
  market_cap_rank?: number

  @Field({ nullable: true })
  fully_diluted_valuation?: number

  @Field()
  total_volume?: number

  @Field()
  high_24h?: number

  @Field()
  low_24h?: number

  @Field()
  price_change_24h?: number

  @Field()
  price_change_percentage_24h?: number

  @Field()
  market_cap_change_24h?: number

  @Field()
  market_cap_change_percentage_24h?: number

  @Field()
  circulating_supply?: number

  @Field()
  total_supply?: number

  @Field({ nullable: true })
  max_supply?: number

  @Field()
  ath?: number

  @Field()
  ath_change_percentage?: number

  @Field()
  ath_date?: string

  @Field()
  atl?: number

  @Field()
  atl_change_percentage?: number

  @Field()
  atl_date?: string

  @Field({ nullable: true })
  roi?: number

  @Field()
  last_updated?: string
}

@Resolver()
class TokenStatsResolver {
  constructor(private readonly tokenStatsService: TokenStatsService) {}

  @Query(() => [TokenData], { name: 'tokenStats' })
  async getStats(
    @Args({ name: 'symbol', type: () => String }) symbol: string,
  ): Promise<any> {
    return this.tokenStatsService.getToken(symbol)
  }
}

export default TokenStatsResolver
