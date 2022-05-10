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

  private cmcApiCall(name: string) {
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

  private async cgApiCall(name: string) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${name}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`
    const urll = `https://api.coingecko.com/api/v3/coins/${name}/market_chart?vs_currency=usd&days=1&interval=daily`
    let response: any = {}
    const marketValueChange = this.httpService.get(url)
    const volumeChange = this.httpService.get(urll)
    const marketValueResult = await lastValueFrom(marketValueChange)
    const volumeChangeResult = await lastValueFrom(volumeChange)
    response = { ...marketValueResult.data, ...volumeChangeResult.data }
    return response
  }

  async getStats(name: string): Promise<any> {
    const cmc = await lastValueFrom(this.cmcApiCall(name))
    const cg = await this.cgApiCall(name)

    const data = { ...cmc.data }
    const res: any = Object.values(data.data)
    const cmcData: any = res[0].quote.USD

    const cgMarketData: any = Object.values(cg)[0]
    const volumeChange =
      ((cg.total_volumes[1][1] - cg.total_volumes[0][1]) /
        cg.total_volumes[0][1]) *
      100

    const tokenStats: TokenData = {
      id: res[0].slug,
      symbol: res[0].symbol,
      name: res[0].name,
      market_cap: cmcData.market_cap,
      market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h,
      diluted_market_cap: cmcData.fully_diluted_market_cap,
      diluted_market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h,
      volume: cmcData.volume_24h,
      volume_percentage_change: volumeChange,
    }
    return tokenStats
  }
}
export default StatsGetterService
