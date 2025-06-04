import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PubSub } from 'graphql-subscriptions'
import { gql } from 'graphql-request'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import MarketCapService from './marketCap.service'
import { MarketCapInputs, RankType, TokenCategory } from './marketcap.dto'
import Pm2Service, { Pm2Events } from '../utils/pm2Service'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'

export const query = gql`
  query {
    hiIQHoldersCount {
      amount
    }
  }
`

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
  @Cron(CronExpression.EVERY_5_MINUTES)
  private async buildRankpageSearchData() {
    if (firstLevelNodeProcess()) {
      this.logger.log('Fetching rankpage search data')
      const tokens = await this.marketCapService.marketData({
        kind: RankType.TOKEN,
      } as MarketCapInputs)

      const stableCoins = await this.marketCapService.marketData({
        kind: RankType.TOKEN,
        category: TokenCategory.STABLE_COINS,
      } as MarketCapInputs)

      const aiTokens = await this.marketCapService.marketData({
        kind: RankType.TOKEN,
        category: TokenCategory.AI,
      } as MarketCapInputs)

      const nfts = await this.marketCapService.marketData({
        kind: RankType.NFT,
      } as MarketCapInputs)

      const data = {
        nfts,
        tokens,
        aiTokens,
        stableCoins,
      }

      const info = JSON.stringify(data)
      this.pm2Service.sendDataToProcesses(
        `${Pm2Events.UPDATE_CACHE} ${MarketCapSearch.name}`,
        {
          data: info,
          key: 'marketCapSearch',
          ttl: this.SIX_MINUTES_TTL,
        },
        Number(process.env.pm_id),
      )

      this.cacheManager.set('marketCapSearch', data, this.SIX_MINUTES_TTL)

      this.pubSub.publish('marketCapSearchSubscription', {
        marketCapSearchSubscription: true,
      })
      this.logger.log('Rankpage search data loaded successfully')
    } else {
      this.logger.log('Rankpage search cache service not runnning')
    }
  }
}

export default MarketCapSearch
