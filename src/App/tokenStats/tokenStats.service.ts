import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'
import { Cache } from 'cache-manager'
import TokenData from './models/tokenData.model'

@Injectable()
class TokenStatsService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getStats(name: string): Promise<TokenData> {
    const url = this.configService.get('TOKEN_STATS_URL')
    const cached: TokenData | undefined = await this.cacheManager.get(name.toLowerCase())
    if (cached) {
        return cached
    }
    const response = this.httpService.get(url + name)
    const result = await lastValueFrom(response)
    const { id } = result.data
    await this.cacheManager.set(id, result.data)   
    return result.data
  }
}
export default TokenStatsService
