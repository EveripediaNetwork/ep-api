import { Injectable, Inject, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { OnEvent } from '@nestjs/event-emitter'
import { firstValueFrom, map, race, Subject, take, timer } from 'rxjs'
import { DataSource } from 'typeorm'
import TokenData from './models/tokenData.model'
import Pm2Service, { Pm2Events } from '../utils/pm2Service'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'

@Injectable()
class StatsGetterService {
  private readonly logger = new Logger(StatsGetterService.name)

  private statsData = new Subject()

  private readonly STATS_DATA_TIMEOUT_MS = 10000

  private API_KEY: string

  constructor(
    private pm2Service: Pm2Service,
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.API_KEY = this.configService.get('COINGECKO_API_KEY') as string
  }

  private async cgApiCall(name: string): Promise<any> {
    const marketCapIdRepository = this.dataSource.getRepository(MarketCapIds)
    const id = await marketCapIdRepository.findOne({
      where: { wikiId: name },
      select: ['coingeckoId'],
    })

    const marketChangeUrl = `https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${
      id?.coingeckoId || name
    }&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    const volumeChangeUrl = `https://pro-api.coingecko.com/api/v3/coins/${
      id?.coingeckoId || name
    }/market_chart?vs_currency=usd&days=1&interval=daily`

    let marketChangeResult
    let volumeChangeResult

    try {
      ;[marketChangeResult, volumeChangeResult] = await Promise.all([
        firstValueFrom(
          this.httpService.get(marketChangeUrl, {
            headers: {
              'x-cg-pro-api-key': this.API_KEY,
            },
          }),
        ),
        firstValueFrom(
          this.httpService.get(volumeChangeUrl, {
            headers: {
              'x-cg-pro-api-key': this.API_KEY,
            },
          }),
        ),
      ])
    } catch (e: any) {
      this.logger.error(
        `COINGECKO ERROR ${e.response.status} ${e.response.statusText} for ${name}`,
      )
    }
    return { marketChangeResult, volumeChangeResult }
  }

  async initiateExternalApiCalls(name: string) {
    const cg = await this.cgApiCall(name)
    const cgMarketData = cg?.marketChangeResult?.data[0] || {}
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
      id: cgMarketData.id,
      symbol: cgMarketData.symbol,
      name: cgMarketData.name,
      token_image_url: cgMarketData.image,
      token_price_in_usd: cgMarketData.current_price,
      market_cap: cgMarketData.market_cap,
      market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h,
      price_percentage_change: cgMarketData.price_change_percentage_24h,
      diluted_market_cap: cgMarketData.fully_diluted_valuation,
      diluted_market_cap_percentage_change:
        cgMarketData.market_cap_change_percentage_24h,
      volume: cgMarketData.total_volume,
      volume_percentage_change: volumeChange,
    }
    if (cgMarketData.id) {
      await this.cacheManager.set(name, tokenStats, 60 * 1000)
    }
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
      `${Pm2Events.STATS_REQUEST_DATA} ${StatsGetterService.name}`,
      { data: requestData },
      'all',
    )

    const timeout$ = timer(this.STATS_DATA_TIMEOUT_MS).pipe(
      take(1),
      map(() => ({ result: TokenData })),
    )
    const data$ = this.statsData.pipe(take(1))
    const result = (await firstValueFrom(race([data$, timeout$]))) as TokenData
    this.statsData = new Subject()
    if (result.id) {
      await this.cacheManager.set(name, result, 60 * 1000)
    }
    return result
  }

  async getStats(name: string): Promise<any> {
    const cachedData = await this.cacheManager.get<TokenData>(name)
    if (cachedData) {
      return cachedData
    }

    if (!firstLevelNodeProcess()) {
      return this.fetchMarketDataFromRoot(name)
    }
    return this.initiateExternalApiCalls(name)
  }

  @OnEvent(Pm2Events.STATS_REQUEST_DATA, { async: true })
  async requestData(payload: any): Promise<void> {
    const { name } = JSON.parse(payload.data.data)

    const tokenData = await this.initiateExternalApiCalls(name)
    const data = JSON.stringify(tokenData)
    await this.pm2Service.sendDataToProcesses(
      `${Pm2Events.STATS_SEND_DATA} ${StatsGetterService.name}`,
      { data },
      0,
    )
  }

  @OnEvent(Pm2Events.STATS_SEND_DATA, { async: true })
  async sendData(payload: any) {
    const stats = JSON.parse(payload.data.data)
    this.statsData.next(stats)
  }
}
export default StatsGetterService
