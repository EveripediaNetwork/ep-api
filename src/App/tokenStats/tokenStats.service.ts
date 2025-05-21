import { Inject, Injectable } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import TokenData from './models/tokenData.model'
import StatsGetterService from './stats-getter.service'

@Injectable()
class TokenStatsService {
  constructor(
    private statsGetterService: StatsGetterService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getStats(name: string, cgAltName?: string): Promise<TokenData> {
    const cached: TokenData | null | undefined = await this.cacheManager.get(
      name.toLowerCase(),
    )
    if (cached) {
      return cached
    }
    const result = await this.statsGetterService.getStats(name, cgAltName)
    await this.cacheManager.set(name.toLowerCase(), result)
    return result
  }
}
export default TokenStatsService
