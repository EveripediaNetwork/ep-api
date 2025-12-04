import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import MarketCapService from './marketCap.service'
import {
  BASE_URL_COINGECKO_API,
  MARKETCAP_SEARCH_CACHE_KEY,
  MarketCapInputs,
  MarketCapSearchType,
  NO_WIKI_MARKETCAP_SEARCH_CACHE_KEY,
  RankType,
  STABLECOIN_CATEGORIES_CACHE_KEY,
} from './marketcap.dto'
import Pm2Service, { Pm2Events } from '../utils/pm2Service'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import GatewayService from '../utils/gatewayService'

@Injectable()
class MarketCapSearch {
  private readonly logger = new Logger(MarketCapSearch.name)
  private readonly SIX_MINUTES_TTL = 6 * 60 * 1000
  private readonly TWENTY_FOUR_HOURS_TTL = 24 * 60 * 60 * 1000

  constructor(
    private marketCapService: MarketCapService,
    private pm2Service: Pm2Service,
    private gateway: GatewayService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.getStablecoinCategories()
    this.buildRankpageSearchData()
  }

  @OnEvent(Pm2Events.BUILD_RANK_SEARCH_DATA, { async: true })
  @Cron(CronExpression.EVERY_5_MINUTES)
  private async buildRankpageSearchData(): Promise<void> {
    if (firstLevelNodeProcess()) {
      await this.loadAllMarketData()
    } else {
      this.logger.log(
        'Rankpage search builder service not running on tsis process.',
      )
    }
  }

  async getStablecoinCategories(): Promise<
    { id: string; name: string; key: string }[]
  > {
    const cached = await this.cacheManager.get<
      { id: string; name: string; key: string }[]
    >(STABLECOIN_CATEGORIES_CACHE_KEY)
    if (cached) {
      return cached
    }

    const data = await this.gateway.fetchData<
      { category_id: string; name: string }[]
    >(`${BASE_URL_COINGECKO_API}coins/categories/list`, 60 * 60)

    const result = data
      .filter(
        (cat) =>
          cat.category_id.includes('stablecoin') ||
          cat.name.toLowerCase().includes('stablecoin'),
      )
      .map((cat) => ({
        id: cat.category_id,
        name: cat.name,
        key: cat.category_id.replace(/-([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        ),
      }))

    await this.cacheManager.set(
      STABLECOIN_CATEGORIES_CACHE_KEY,
      result,
      this.TWENTY_FOUR_HOURS_TTL,
    )

    return result
  }

  async loadAllMarketData(): Promise<void> {
    const stablecoinCategories = await this.getStablecoinCategories()
    const state = this.initializeState(stablecoinCategories)
    await this.processAllDataStreams(state, stablecoinCategories)
    await this.cacheNoWikiItems(state)
  }

  private async cacheNoWikiItems(state: MarketCapSearchType): Promise<void> {
    const noWikiState: MarketCapSearchType = Object.fromEntries(
      Object.entries(state).map(([key, items]) => [
        key,
        items.filter((item) => this.hasNoWiki(item)),
      ]),
    ) as MarketCapSearchType

    await this.cacheManager.set(
      NO_WIKI_MARKETCAP_SEARCH_CACHE_KEY,
      noWikiState,
      this.SIX_MINUTES_TTL,
    )

    const totalNoWiki = Object.values(noWikiState).reduce(
      (sum, arr) => sum + arr.length,
      0,
    )
    this.logger.log(`Cached ${totalNoWiki} items without wikis`)

    this.pm2Service.sendDataToProcesses(
      `${Pm2Events.UPDATE_CACHE} ${MarketCapSearch.name}`,
      {
        data: JSON.stringify(noWikiState),
        key: NO_WIKI_MARKETCAP_SEARCH_CACHE_KEY,
        ttl: this.SIX_MINUTES_TTL,
        isProtobuf: false,
      },
      Number(process.env.pm_id),
    )
  }

  private hasNoWiki(item: any): boolean {
    return (
      item.id === 'no-content' ||
      item.tokenMarketData?.hasWiki === false ||
      item.nftMarketData?.hasWiki === false
    )
  }

  private initializeState(
    stablecoinCategories: { id: string; name: string; key: string }[],
  ): MarketCapSearchType {
    const state: MarketCapSearchType = {
      nfts: [],
      tokens: [],
      aiTokens: [],
      memeTokens: [],
      stableCoins: [],
    }

    for (const category of stablecoinCategories) {
      state[category.key] = []
    }

    return state
  }

  private async processAllDataStreams(
    state: MarketCapSearchType,
    stablecoinCategories: { id: string; name: string; key: string }[],
  ): Promise<void> {
    await Promise.all([
      this.processStream(
        { kind: RankType.NFT } as MarketCapInputs,
        'nfts',
        state,
      ),
      this.processStream(
        { kind: RankType.TOKEN } as MarketCapInputs,
        'tokens',
        state,
      ),
      this.processStream(
        {
          kind: RankType.TOKEN,
          category: 'stablecoins',
        } as MarketCapInputs,
        'stableCoins',
        state,
      ),
      this.processStream(
        {
          kind: RankType.TOKEN,
          category: 'artificial-intelligence',
        } as MarketCapInputs,
        'aiTokens',
        state,
      ),
      this.processStream(
        {
          kind: RankType.TOKEN,
          category: 'meme-token',
        } as MarketCapInputs,
        'memeTokens',
        state,
      ),
      ...stablecoinCategories.map((category) =>
        this.processStream(
          {
            kind: RankType.TOKEN,
            category: category.id,
          } as MarketCapInputs,
          category.key,
          state,
        ),
      ),
    ])
  }

  private async processStream(
    args: MarketCapInputs,
    key: keyof MarketCapSearchType,
    state: MarketCapSearchType,
  ): Promise<void> {
    const stream = this.marketCapService.marketData(args)

    for await (const batch of stream) {
      state[key] = this.mergeUnique(state[key] as any[], batch as any[])

      if (key === 'krwStablecoin') {
        state.tokens = this.mergeUnique(state.tokens as any[], batch as any[])
      }

      await this.updateCacheAndNotify(state, key, batch.length)
    }
  }

  private async updateCacheAndNotify(
    state: MarketCapSearchType,
    key: keyof MarketCapSearchType,
    batchSize: number,
  ): Promise<void> {
    await this.cacheManager.set(
      MARKETCAP_SEARCH_CACHE_KEY,
      state,
      this.SIX_MINUTES_TTL,
    )

    this.logger.log(`${key}: +${batchSize} items (total: ${state[key].length})`)

    this.pm2Service.sendDataToProcesses(
      `${Pm2Events.UPDATE_CACHE} ${MarketCapSearch.name}`,
      {
        data: JSON.stringify(state),
        key: MARKETCAP_SEARCH_CACHE_KEY,
        ttl: this.SIX_MINUTES_TTL,
        isProtobuf: false,
      },
      Number(process.env.pm_id),
    )
  }

  private mergeUnique<T extends { id: string }>(
    existing: T[] = [],
    incoming: T[] = [],
  ): T[] {
    const map = new Map<string, T>()
    existing.forEach((item: T) => map.set(item.id, item))
    incoming.forEach((item: T) => map.set(item.id, item))
    return Array.from(map.values())
  }
}

export default MarketCapSearch
