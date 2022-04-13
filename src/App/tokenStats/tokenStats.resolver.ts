import { Args, Query, Resolver } from '@nestjs/graphql'
import TokenStatsService from './tokenStats.service'
import TokenData from './models/tokenData.model'
import { NotFoundException } from '@nestjs/common'

@Resolver()
class TokenStatsResolver {
  constructor(private readonly tokenStatsService: TokenStatsService) {}

  private errorHandler(val: TokenData[]) {
    if (val.length === 0) {
      throw new NotFoundException()
    } else {
      return val
    }
  }

  @Query(() => [TokenData], { name: 'tokenStats' })
  async getStats(
    @Args({ name: 'symbol', type: () => String }) symbol: string,
  ): Promise<TokenData[]> {
      const result = await this.tokenStatsService.getToken(symbol)
    return this.errorHandler(result)
  }
}

export default TokenStatsResolver
