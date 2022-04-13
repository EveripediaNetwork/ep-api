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

  async getStats(): Promise<[TokenData]> {
    const url = this.configService.get('TOKEN_STATS_URL')
    const response = this.httpService.get(url)
    const result = await lastValueFrom(response)

    await this.cacheManager.set('data', result.data)

    return result.data
  }

  async getToken(symb: string): Promise<TokenData[]> {
    const data: [TokenData] | undefined = await this.cacheManager.get('data')
    const stats = (e: [TokenData]) => e.filter((v: any) => v.symbol === symb)
    if (data) {
      return stats(data)
    }
    return stats(await this.getStats())
  }
}
export default TokenStatsService
