import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron } from '@nestjs/schedule'
import { PubSub } from 'graphql-subscriptions'
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

  private pubSub: PubSub

  private SIX_MINUTES_TTL = 6 * 60 * 1000

  constructor(
    private marketCapService: MarketCapService,
    private pm2Service: Pm2Service,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.pubSub = new PubSub()
  }

  getRankPagePubSub(): PubSub {
    return this.pubSub
  }

  async onApplicationBootstrap() {
    this.pubSub.publish('marketCapSearchSubscription', {
      marketCapSearchSubscription: false,
    })
    this.buildRankpageSearchData()
  }

  @OnEvent(Pm2Events.BUILD_RANK_SEARCH_DATA, { async: true })
  @Cron('0 */7 * * * *')
  private async buildRankpageSearchData() {
    if (firstLevelNodeProcess()) {
      await this.loadAllMarketData()
      this.pubSub.publish('marketCapSearchSubscription', {
        marketCapSearchSubscription: true,
      })
    } else {
      this.logger.log(
        'Rankpage search builder service not running on tsis process.',
      )
    }
  }

  async loadAllMarketData() {
    const state: MarketCapSearchType = {
      nfts: [],
      tokens: [],
      aiTokens: [],
      krwTokens: [],
      memeTokens: [],
      stableCoins: [],
    }

    const processStream = async (
      args: MarketCapInputs,
      key: keyof MarketCapSearchType,
    ) => {
      const stream = this.marketCapService.marketData(args)
      for await (const batch of stream) {
        state[key] = this.mergeUnique(state[key], batch)

        // Also merge krwTokens into tokens for general TOKEN searches
        if (key === 'krwTokens') {
          state.tokens = this.mergeUnique(state.tokens, batch)
        }

        await this.cacheManager.set(
          'marketCapSearch',
          { ...state },
          this.SIX_MINUTES_TTL,
        )
        this.logger.log(
          `${key}: +${batch.length} items (total: ${state[key].length})`,
        )

        this.pm2Service.sendDataToProcesses(
          `${Pm2Events.UPDATE_CACHE} ${MarketCapSearch.name}`,
          {
            data: JSON.stringify(state),
            key: 'marketCapSearch',
            ttl: this.SIX_MINUTES_TTL,
          },
          Number(process.env.pm_id),
        )
      }
    }

    await Promise.all([
      processStream({ kind: RankType.NFT } as MarketCapInputs, 'nfts'),
      processStream({ kind: RankType.TOKEN } as MarketCapInputs, 'tokens'),
      processStream(
        {
          kind: RankType.TOKEN,
          category: TokenCategory.STABLE_COINS,
        } as MarketCapInputs,
        'stableCoins',
      ),
      processStream(
        { kind: RankType.TOKEN, category: TokenCategory.AI } as MarketCapInputs,
        'aiTokens',
      ),
      processStream(
        {
          kind: RankType.TOKEN,
          category: TokenCategory.MEME_TOKENS,
        } as MarketCapInputs,
        'memeTokens',
      ),
      processStream(
        {
          kind: RankType.TOKEN,
          category: TokenCategory.KRW_TOKENS,
        } as MarketCapInputs,
        'krwTokens',
      ),
    ])

    this.logger.log('All market data loaded successfully', {
      nfts: state.nfts.length,
      tokens: state.tokens.length,
      aiTokens: state.aiTokens.length,
      krwTokens: state.krwTokens.length,
      memeTokens: state.memeTokens.length,
      stableCoins: state.stableCoins.length,
    })
  }

  private mergeUnique<T extends { id: string | number }>(
    existing: T[] = [],
    incoming: T[] = [],
  ): T[] {
    const map = new Map(existing.map((item) => [item.id, item]))
    incoming.forEach((item) => map.set(item.id, item))
    return Array.from(map.values())
  }
}

export default MarketCapSearch
