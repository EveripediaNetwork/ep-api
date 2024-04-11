/* eslint-disable no-console */
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import TokenData from './models/tokenData.model'

const noData = {
  data: {
    data: {
      '0': {
        id: 0,
        name: 'not_found',
        symbol: 'NOT_FOUND',
        slug: 'not_found',
        quote: {
          USD: {
            volume_24h: 0,
            market_cap: 0,
            market_cap_change_percentage_24h: 0,
            fully_diluted_market_cap: 0,
          },
        },
      },
    },
  },
}

@Injectable()
class StatsGetterService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private async cmcApiCall(name: string): Promise<any> {
    let response
    try {
      const url =
        'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
      const key = this.configService.get('COINMARKETCAP_API_KEY')
      response = await this.httpService
        .get(`${url}?slug=${name}`, {
          headers: {
            'X-CMC_PRO_API_KEY': key,
          },
        })
        .toPromise()
    } catch (e: any) {
      console.error(
        `COINMARKETCAP ERROR ${e.response.status}`,
        e.response.statusText,
        `for ${name}`,
      )
    }
    return response
  }

  private async cgApiCall(name: string): Promise<any> {
    const key = this.configService.get('COINGECKO_API_KEY')
    const marketChangeUrl = `https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${name}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`
    const volumeChangeUrl = `https://pro-api.coingecko.com/api/v3/coins/${name}/market_chart?vs_currency=usd&days=1&interval=daily`

    let marketChangeResult
    let volumeChangeResult

    try {
      ;[marketChangeResult, volumeChangeResult] = await Promise.all([
        this.httpService
          .get(marketChangeUrl, {
            headers: {
              'x-cg-pro-api-key': key,
            },
          })
          .toPromise(),
        this.httpService
          .get(volumeChangeUrl, {
            headers: {
              'x-cg-pro-api-key': key,
            },
          })
          .toPromise(),
      ])
    } catch (e: any) {
      console.error(
        `COINGECKO  ERROR ${e.response.status}`,
        e.response.statusText,
        `for ${name}`,
      )
    }
    return { marketChangeResult, volumeChangeResult }
  }

  async getStats(name: string, cmcName?: string): Promise<any> {
    const cmc = cmcName
      ? await this.cmcApiCall(cmcName)
      : await this.cmcApiCall(name)
    const cg = await this.cgApiCall(name)

    const cgMarketData = cg?.marketChangeResult?.data[0] || {
      image: '',
      current_price: 0,
      market_cap_change_percentage_24h: 0,
      price_change_24h: 0,
    }
    const cgVolumeData = cg?.volumeChangeResult?.data || {
      total_volumes: [
        [1, 1],
        [1, 1],
      ],
    }

    const dat = cmc || noData
    const d = dat.data
    const res: any = Object.values(d.data)
    const cmcData: any = res[0].quote.USD

    const volumeChange =
      cgVolumeData.total_volumes.length === 1
        ? cgVolumeData.total_volumes[0][1] * cgVolumeData.total_volumes * 100
        : ((cgVolumeData.total_volumes[1][1] -
            cgVolumeData.total_volumes[0][1]) /
            cgVolumeData.total_volumes[0][1]) *
          100

    let marketCap

    if (cgMarketData.market_cap !== 0 && cmcData.market_cap !== 0) {
      marketCap = cgMarketData.market_cap
    } else if (cgMarketData.market_cap === 0) {
      marketCap = cmcData.market_cap
    } else {
      marketCap = cgMarketData.market_cap
    }

    const tokenStats: TokenData = {
      id: res[0].slug,
      symbol: res[0].symbol,
      name: res[0].name,
      token_image_url: cgMarketData.image,
      token_price_in_usd: cgMarketData.current_price,
      market_cap: marketCap || 0,
      market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h,
      price_percentage_change: cgMarketData.price_change_24h,
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
