import { Args, Query, Resolver } from '@nestjs/graphql'
import TokenStatsService from './tokenStats.service'
import TokenData from './models/tokenData.model'

@Resolver()
class TokenStatsResolver {
  constructor(private readonly tokenStatsService: TokenStatsService) {}

  @Query(() => TokenData, { name: 'tokenStats' })
  async getTokenStats(
    @Args({ name: 'tokenName', type: () => String }) tokenName: string,
    @Args({ name: 'cmcTokenName', type: () => String, nullable: true })
    cmcTokenName?: string,
  ): Promise<TokenData> {
    const result = await this.tokenStatsService.getStats(
      tokenName.toLowerCase(),
      cmcTokenName?.toLowerCase(),
    )
    return result
  }
}

export default TokenStatsResolver
