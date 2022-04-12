import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'

@Injectable()
class TokenStatsService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async getStats(): Promise<any[]> {
    // TODO: use proper env url
    const response = this.httpService.get(
      // this.configService.get<string>('TOKEN_STATS_URL'),
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd',
    )
    const result = await lastValueFrom(response)
    return result.data
  }

  async getToken(symb: string): Promise<any> {
    const res = await this.getStats()
    return res.filter(e => e.symbol === symb)
  }
}
export default TokenStatsService
