import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { firstValueFrom, map, race, Subject, take, timer } from 'rxjs'
import { DataSource } from 'typeorm'
import TokenData from './models/tokenData.model'
import Pm2Service, { Pm2Events } from '../utils/pm2Service'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import GatewayService from '../utils/gatewayService'

const CACHE_DURATION = {
  TOKEN_DATA: 60 * 1000, // 1 minute
  API_DATA: 24 * 60 * 60, // 24 hours
  NOT_FOUND: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
} as const

const API_ENDPOINTS = {
  COINGECKO_BASE: 'https://pro-api.coingecko.com/api/v3',
  COINS_MARKETS: (id: string) =>
    `${API_ENDPOINTS.COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${id}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`,
  MARKET_CHART: (id: string) =>
    `${API_ENDPOINTS.COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=1&interval=daily`,
  NFTS: (id: string) => `${API_ENDPOINTS.COINGECKO_BASE}/nfts/${id}`,
} as const

interface TokenIdentifier {
  id: string
  category: 'cryptocurrencies' | 'nfts'
}

interface CoinGeckoResponse {
  marketChangeResult?: any[]
  volumeChangeResult?: { data?: { total_volumes: number[][] } }
}

interface CacheKeys {
  tokenData: (name: string) => string
  notFound: (name: string) => string
}

@Injectable()
class StatsGetterService {
  private readonly logger = new Logger(StatsGetterService.name)

  private statsData = new Subject()

  private readonly STATS_DATA_TIMEOUT_MS = 10000

  constructor(
    private pm2Service: Pm2Service,
    private dataSource: DataSource,
    private gateway: GatewayService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getCacheKeys(): CacheKeys {
    return {
      tokenData: (name: string) => `${name}-token`,
      notFound: (name: string) => `${name}-not-found`,
    }
  }

  private buildApiUrl(
    id: string,
    category: string,
  ): { marketUrl: string; volumeUrl?: string } {
    if (category === 'nfts') {
      return { marketUrl: API_ENDPOINTS.NFTS(id) }
    }
    return {
      marketUrl: API_ENDPOINTS.COINS_MARKETS(id),
      volumeUrl: API_ENDPOINTS.MARKET_CHART(id),
    }
  }

  private calculateVolumeChange(volumeData: {
    total_volumes: number[][]
  }): number {
    if (volumeData.total_volumes.length === 1) return 0

    const [prev, current] = volumeData.total_volumes
    return ((current[1] - prev[1]) / prev[1]) * 100
  }

  private transformCryptoData(
    marketData: any,
    volumeChange: number,
  ): Partial<TokenData> {
    return {
      id: marketData.id,
      symbol: marketData.symbol,
      name: marketData.name,
      token_image_url: marketData.image,
      token_price_in_usd: marketData.current_price,
      market_cap: marketData.market_cap,
      market_cap_percentage_change: marketData.market_cap_change_percentage_24h,
      price_percentage_change: marketData.price_change_percentage_24h,
      diluted_market_cap: marketData.fully_diluted_valuation,
      diluted_market_cap_percentage_change:
        marketData.market_cap_change_percentage_24h,
      volume: marketData.total_volume,
      volume_percentage_change: volumeChange,
    }
  }

  private transformNftData(nftData: any): Partial<TokenData> {
    return {
      id: nftData.id,
      symbol: nftData.symbol,
      name: nftData.name,
      token_image_url: nftData.image?.small,
      token_price_in_usd: nftData.floor_price?.usd,
      market_cap: nftData.market_cap?.usd,
      market_cap_percentage_change:
        nftData.market_cap_24h_percentage_change?.usd,
      price_percentage_change: nftData.floor_price_in_usd_24h_percentage_change,
      diluted_market_cap: nftData.market_cap?.usd,
      diluted_market_cap_percentage_change:
        nftData.market_cap_24h_percentage_change?.usd,
      volume: nftData.volume_24h?.usd,
      volume_percentage_change: nftData.volume_in_usd_24h_percentage_change,
    }
  }

  private async findTokenOrNftId(
    name: string,
  ): Promise<TokenIdentifier | null> {
    const result = await this.dataSource
      .getRepository(Wiki)
      .createQueryBuilder('wiki')
      .leftJoin(MarketCapIds, 'marketCapId', 'marketCapId.wikiId = wiki.id')
      .leftJoin('wiki.categories', 'category')
      .where('wiki.id = :name', { name })
      .select(['marketCapId.coingeckoId', 'category.id'])
      .getRawOne()

    const category = result?.category_id
    if (category !== 'cryptocurrencies' && category !== 'nfts') {
      return null
    }

    return {
      id: result.marketCapId_coingeckoId || name,
      category: category as 'cryptocurrencies' | 'nfts',
    }
  }

  private async cgApiCall(
    id: string,
    category: string,
  ): Promise<CoinGeckoResponse> {
    const cacheKeys = this.getCacheKeys()
    const isNotFound = await this.cacheManager.get(cacheKeys.notFound(id))

    if (isNotFound) {
      this.logger.debug(`Token ${id} is cached as not found, skipping API call`)
      return {}
    }

    const { marketUrl, volumeUrl } = this.buildApiUrl(id, category)
    let marketChangeResult
    let volumeChangeResult

    try {
      if (category === 'nfts') {
        marketChangeResult = await this.gateway.fetchData<any>(
          marketUrl,
          CACHE_DURATION.API_DATA,
        )
      } else {
        ;[marketChangeResult, volumeChangeResult] = await Promise.all([
          this.gateway.fetchData<any[]>(marketUrl, CACHE_DURATION.API_DATA),
          this.gateway.fetchData<any>(volumeUrl!, CACHE_DURATION.API_DATA),
        ])
      }
    } catch (e: any) {
      this.logger.error(
        `COINGECKO ERROR ${e.response?.status} ${e.response?.statusText} for ${id}`,
      )
      await this.cacheManager.set(
        cacheKeys.notFound(id),
        true,
        CACHE_DURATION.NOT_FOUND,
      )
    }

    return { marketChangeResult, volumeChangeResult }
  }

  async initiateExternalApiCalls(name: string): Promise<TokenData> {
    const identifier = await this.findTokenOrNftId(name)
    if (!identifier) {
      return new TokenData()
    }

    const cg = await this.cgApiCall(identifier.id, identifier.category)
    const marketData =
      identifier.category === 'nfts'
        ? cg.marketChangeResult
        : cg.marketChangeResult?.[0]

    if (!marketData) {
      return new TokenData()
    }

    const tokenStats = new TokenData()

    if (identifier.category === 'nfts') {
      Object.assign(tokenStats, this.transformNftData(marketData))
    } else {
      const volumeData = cg.volumeChangeResult?.data || {
        total_volumes: [
          [1, 1],
          [1, 1],
        ],
      }
      const volumeChange = this.calculateVolumeChange(volumeData)
      Object.assign(
        tokenStats,
        this.transformCryptoData(marketData, volumeChange),
      )
    }
    if (tokenStats.id) {
      const cacheKeys = this.getCacheKeys()
      await this.cacheManager.set(
        cacheKeys.tokenData(name),
        tokenStats,
        CACHE_DURATION.TOKEN_DATA,
      )
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
      const cacheKeys = this.getCacheKeys()
      await this.cacheManager.set(
        cacheKeys.tokenData(name),
        result,
        CACHE_DURATION.TOKEN_DATA,
      )
    }
    return result
  }

  async getStats(name: string): Promise<TokenData> {
    const cacheKeys = this.getCacheKeys()
    const cachedData = await this.cacheManager.get<TokenData>(
      cacheKeys.tokenData(name),
    )

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
