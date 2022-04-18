import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'
import TokenData from '../models/tokenData.model'

@Injectable()
class StatsGetterService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private makeApiCall(name: string) {
    const url =
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    const key = this.configService.get('COINMARKETCAP_API_KEY')
    const response = this.httpService.get(`${url}?slug=${name}`, {
      headers: {
        'X-CMC_PRO_API_KEY': key,
      },
    })
    return response
  }

  async getStats(name: string): Promise<any> {
    const result = await lastValueFrom(this.makeApiCall(name))

    const data = { ...result.data }
    const res: any = Object.values(data.data)
    const cmcData: any = res[0].quote.USD

    const tokenStats: TokenData = {
      id: res[0].slug,
      symbol: res[0].symbol,
      name: res[0].name,
      market_cap: cmcData.market_cap,
      market_cap_percentage_change: 0,
      diluted_market_cap: cmcData.fully_diluted_market_cap,
      diluted_market_cap_percentage_change: 0,
      volume: cmcData.volume_24h,
      volume_percentage_change: 0,
    }
    return tokenStats
  }
}
export default StatsGetterService
