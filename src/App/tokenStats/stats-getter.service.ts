/* eslint-disable no-console */
import { Injectable, Inject } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { OnEvent } from '@nestjs/event-emitter'
import { firstValueFrom, map, race, Subject, take, timer } from 'rxjs'
import TokenData from './models/tokenData.model'
import Pm2Service from '../utils/pm2Service'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'

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
  private statsData = new Subject()

  private lastBlockedTime = 0

  private readonly cooldownPeriod = 60 * 1000

  constructor(
    private pm2Service: Pm2Service,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  public canCallApi(): boolean {
    const currentTime = Date.now()
    return currentTime > this.lastBlockedTime + this.cooldownPeriod
  }

  public rateLimitHit(): void {
    this.lastBlockedTime = Date.now()
  }

  private async cmcApiCall(name: string): Promise<any> {
    if (!this.canCallApi()) {
      console.warn('COINMARKETCAP API cooloff')
      return null
    }
    let response
    try {
      const url =
        'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
      const key = this.configService.get('COINMARKETCAP_API_KEY')
      response = await firstValueFrom(
        this.httpService.get(`${url}?slug=${name}`, {
          headers: {
            'X-CMC_PRO_API_KEY': key,
          },
        }),
      )
    } catch (e: any) {
      console.log(e)
      if (e.response.status === 429) {
        this.rateLimitHit()
      }
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
        firstValueFrom(
          this.httpService.get(marketChangeUrl, {
            headers: {
              'x-cg-pro-api-key': key,
            },
          }),
        ),
        firstValueFrom(
          this.httpService.get(volumeChangeUrl, {
            headers: {
              'x-cg-pro-api-key': key,
            },
          }),
        ),
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

  async initiateExternalApiCalls(name: string, cmcName?: string) {
    const cacheKey = `${name}-${cmcName}`
    const [cmc, cg] = await Promise.all([
      this.cmcApiCall(cmcName || name),
      this.cgApiCall(name),
    ])

    const cgMarketData = cg?.marketChangeResult?.data[0] || {
      image: '',
      current_price: 0,
      market_cap_change_percentage_24h: 0,
      price_change_percentage_24h: 0,
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
        ? 0
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
      price_percentage_change: cgMarketData.price_change_percentage_24h,
      diluted_market_cap: cmcData.fully_diluted_market_cap,
      diluted_market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h,
      volume: cmcData.volume_24h,
      volume_percentage_change: volumeChange,
    }
    await this.cacheManager.set(cacheKey, tokenStats, 60 * 1000)
    return tokenStats
  }

  async fetchMarketDataFromRoot(
    name: string,
    cmcName?: string,
  ): Promise<TokenData> {
    const requestData = JSON.stringify({
      processId: process.env.pm_id,
      name,
      cmcName,
    })

    this.pm2Service.sendDataToProcesses(
      'ep-api',
      'statsRequestData [statsGetterService]',
      { data: requestData },
      'all',
    )

    const timeout$ = timer(10000).pipe(
      take(1),
      map(() => ({ result: TokenData })),
    )
    const data$ = this.statsData.pipe(take(1))
    const result = (await firstValueFrom(race([data$, timeout$]))) as TokenData
    this.statsData = new Subject()
    return result
  }

  async getStats(name: string, cmcName?: string): Promise<any> {
    const cacheKey = `${name}-${cmcName}`
    const cachedData = await this.cacheManager.get<TokenData>(cacheKey)
    if (cachedData) {
      return cachedData
    }

    if (!firstLevelNodeProcess()) {
      return this.fetchMarketDataFromRoot(name, cmcName)
    }
    return this.initiateExternalApiCalls(name, cmcName)
  }

  @OnEvent('statsRequestData', { async: true })
  async requestData(payload: any): Promise<void> {
    const { processId, name, cmcName } = JSON.parse(payload.data.data)
    const id = Number(processId)

    const tokenData = await this.initiateExternalApiCalls(name, cmcName)
    const data = JSON.stringify(tokenData)
    await this.pm2Service.sendDataToProcesses(
      'ep-api',
      'statsSendData [statsGetterService]',
      { data },
      'one',
      id,
    )
  }

  @OnEvent('statsSendData', { async: true })
  async sendData(payload: any) {
    const stats = JSON.parse(payload.data.data)
    this.statsData.next(stats)
  }
}
export default StatsGetterService
