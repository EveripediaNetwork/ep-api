import { Args, Query, Resolver } from '@nestjs/graphql'
import { UseInterceptors } from '@nestjs/common'
import TokenStatsService from './tokenStats.service'
import TokenData from './models/tokenData.model'
import SentryInterceptor from '../../sentry/security.interceptor'

@UseInterceptors(SentryInterceptor)
@Resolver()
class TokenStatsResolver {
  constructor(private readonly tokenStatsService: TokenStatsService) {}

  @Query(() => TokenData, { name: 'tokenStats' })
  async getTokenStats(
    @Args({ name: 'tokenName', type: () => String }) tokenName: string,
  ): Promise<TokenData> {
    const result = await this.tokenStatsService.getStats(
      tokenName.toLowerCase(),
    )
    return result
  }
}

export default TokenStatsResolver
