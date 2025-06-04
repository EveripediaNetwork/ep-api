import { Args, Query, Resolver } from '@nestjs/graphql'
import TokenData, { TokenStatArgs } from './models/tokenData.model'
import StatsGetterService from './stats-getter.service'

@Resolver()
class TokenStatsResolver {
  constructor(private readonly tokenStatsService: StatsGetterService) {}

  @Query(() => TokenData, { name: 'tokenStats' })
  async getTokenStats(@Args() args: TokenStatArgs): Promise<TokenData> {
    const result = await this.tokenStatsService.getStats(
      args.tokenName.toLowerCase(),
    )
    return result
  }
}

export default TokenStatsResolver
