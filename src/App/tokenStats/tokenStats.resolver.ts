import { Args, Query, Resolver } from '@nestjs/graphql'
import TokenStatsService from './tokenStats.service'
import TokenData from './models/tokenData.model'

@Resolver()
class TokenStatsResolver {
  constructor(private readonly tokenStatsService: TokenStatsService) {}

  @Query(() => [TokenData], { name: 'tokenStats' })
  async getStats(
    @Args({ name: 'symbol', type: () => String }) symbol: string,
  ): Promise<TokenData[]> {
    return this.tokenStatsService.getToken(symbol)
  }
}

export default TokenStatsResolver
