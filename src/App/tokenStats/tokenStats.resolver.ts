import { Args, Query, Resolver } from '@nestjs/graphql'
import TokenStatsService from './tokenStats.service'
import TokenData, { TokenStatArgs } from './models/tokenData.model'

@Resolver()
class TokenStatsResolver {
  constructor(private readonly tokenStatsService: TokenStatsService) {}

  @Query(() => TokenData, { name: 'tokenStats' })
  async getTokenStats(
    @Args() args: TokenStatArgs,
  ): Promise<TokenData> {
    const result = await this.tokenStatsService.getStats(
      args.tokenName.toLowerCase(),
      args.cmcTokenName?.toLowerCase(),
    )
    return result
  }
}

export default TokenStatsResolver
