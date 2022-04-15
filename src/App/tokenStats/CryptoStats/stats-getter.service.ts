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
    const url = this.configService.get('COINMARKETCAP_URL')
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

    // destructure result.data
    const data = { ...result.data }
    const res: any = Object.values(data.data)
    const cmcData: any = res[0].quote.USD

    // coingecko response
    // const tokenStats: TokenData = {
    //   id: data.id,
    //   symbol: data.symbol,
    //   name: data.name,
    //   market_cap: data.market_data.market_cap.usd,
    //   market_cap_percentage_change:
    //     data.market_data.market_cap_change_percentage_24h,
    //   diluted_market_cap: data.market_data.fully_diluted_valuation.usd,
    //   diluted_market_cap_percentage_change: 0,
    //   volume: data.market_data.total_volume.usd,
    //   volume_percentage_change: 0,
    // }

    // coinmarketcap
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
