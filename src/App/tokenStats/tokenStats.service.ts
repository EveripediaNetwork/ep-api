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
    // TODO: use proper env url
    const response = this.httpService.get(
      // this.configService.get<string>('TOKEN_STATS_URL'),
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd',
    )
    const result = await lastValueFrom(response)

    await this.cacheManager.set('data', result.data)

    return result.data
  }

  async getToken(symb: string): Promise<any> {
    const data: any = await this.cacheManager.get('data')
    const stats = (e: [TokenData]) => e.filter((v: any) => v.symbol === symb)
    if (data) {
        console.log('from cache')
        return stats(data)
    }
    console.log('calling api')
    return stats(await this.getStats())
  }
}
export default TokenStatsService
