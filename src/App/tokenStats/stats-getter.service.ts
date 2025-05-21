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
        `COINGECKO  ERROR ${e.response.status || 'unknown'}`,
        e.response.statusText || 'Error',
        `for ${name}`,
      )
    }
    return { marketChangeResult, volumeChangeResult }
  }

  async getStats(name: string, cgAltName?: string): Promise<any> {
    let cg = await this.cgApiCall(name)

    if (
      (!cg?.marketChangeResult?.data ||
        cg.marketChangeResult.data.length === 0) &&
      cgAltName
    ) {
      cg = await this.cgApiCall(cgAltName)
    }

    const cgMarketData = cg?.marketChangeResult?.data?.[0] || noData
    const cgVolumeData = cg?.volumeChangeResult?.data || {
      total_volumes: [
        [1, 1],
        [1, 1],
      ],
    }

    const volumeChange =
      cgVolumeData.total_volumes.length === 1
        ? 0
        : ((cgVolumeData.total_volumes[1][1] -
            cgVolumeData.total_volumes[0][1]) /
            cgVolumeData.total_volumes[0][1]) *
          100

    const tokenStats: TokenData = {
      id: cgMarketData.id || 'not_found',
      symbol: cgMarketData.symbol || 'NOT_FOUND',
      name: cgMarketData.name || 'not_found',
      token_image_url: cgMarketData.image || '',
      token_price_in_usd: cgMarketData.current_price || 0,
      market_cap: cgMarketData.market_cap || 0,
      market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h || 0,
      price_percentage_change: cgMarketData.price_change_percentage_24h || 0,
      diluted_market_cap: cgMarketData.fully_diluted_valuation || 0,
      diluted_market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h || 0,
      volume: cgMarketData.total_volume || 0,
      volume_percentage_change: volumeChange || 0,
    }
    return tokenStats
  }
}
export default StatsGetterService
