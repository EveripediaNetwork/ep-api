import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import MarketCapService from './marketCap.service'
import {
  MarketCapInputs,
  MarketCapSearchType,
  RankType,
  TokenCategory,
} from './marketcap.dto'
import Pm2Service, { Pm2Events } from '../utils/pm2Service'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'

@Injectable()
class MarketCapSearch {
  private readonly logger = new Logger(MarketCapSearch.name)
  private readonly SIX_MINUTES_TTL = 6 * 60 * 1000

  constructor(
    private marketCapService: MarketCapService,
    private pm2Service: Pm2Service,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
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

  async loadAllMarketData(): Promise<void> {
    const state = this.initializeState()
    await this.processAllDataStreams(state)
  }

  private initializeState(): MarketCapSearchType {
    return {
      nfts: [],
      tokens: [],
      aiTokens: [],
      krwTokens: [],
      memeTokens: [],
      stableCoins: [],
    }
  }

  private async processAllDataStreams(
    state: MarketCapSearchType,
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
          category: TokenCategory.STABLE_COINS,
        } as MarketCapInputs,
        'stableCoins',
        state,
      ),
      this.processStream(
        {
          kind: RankType.TOKEN,
          category: TokenCategory.AI,
        } as MarketCapInputs,
        'aiTokens',
        state,
      ),
      this.processStream(
        {
          kind: RankType.TOKEN,
          category: TokenCategory.MEME_TOKENS,
        } as MarketCapInputs,
        'memeTokens',
        state,
      ),
      this.processStream(
        {
          kind: RankType.TOKEN,
          category: TokenCategory.KRW_TOKENS,
        } as MarketCapInputs,
        'krwTokens',
        state,
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

      if (key === 'krwTokens') {
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
    await this.cacheManager.set('marketCapSearch', state, this.SIX_MINUTES_TTL)

    this.logger.log(`${key}: +${batchSize} items (total: ${state[key].length})`)

    this.pm2Service.sendDataToProcesses(
      `${Pm2Events.UPDATE_CACHE} ${MarketCapSearch.name}`,
      {
        data: JSON.stringify(state),
        key: 'marketCapSearch',
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
