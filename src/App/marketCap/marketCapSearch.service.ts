import { CACHE_MANAGER, Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PubSub } from 'graphql-subscriptions'
import MarketCapService from './marketCap.service'
import { MarketCapInputs, RankType, TokenCategory } from './marketcap.dto'
import Pm2Service from '../utils/pm2Service'
import { Globals } from '../../globalVars'

@Injectable()
class MarketCapSearch implements OnModuleInit {
  private pubSub: PubSub

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

  async onModuleInit() {
    if (Number(process.env.pm_id) === 0) {
      Globals.ROOT_PROCESS = true
    }

    setTimeout(() => {
      this.pubSub.publish('marketCapSearchSubscription', {
        marketCapSearchSubscription: false,
      })
      this.buildRankpageSearchData()
    }, 15000)
  }

  @OnEvent('buildSearchData', { async: true })
  @Cron(CronExpression.EVERY_5_MINUTES)
  private async buildRankpageSearchData() {
    if (Globals.ROOT_PROCESS) {
      console.log('Fetching rankpage search data')
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
        'ep-api',
        'updateCache [marketCapSearch]',
        {
          data: info,
          key: 'marketCapSearch',
        },
        Number(process.env.pm_id),
      )

      this.cacheManager.set('marketCapSearch', { tokens, data }, 300)

      this.pubSub.publish('marketCapSearchSubscription', {
        marketCapSearchSubscription: true,
      })
      console.log('Rankpage search data loaded successfully')
    } else {
      console.log('Rankpage search cache service not runnning')
    }
  }

  @OnEvent('updateCache')
  async setCacheData(payload: any) {
    const data = JSON.parse(payload.data.data)
    await this.cacheManager.set(payload.data.key, data, {
      ttl: payload.data.ttl || 300,
    })
  }

  @OnEvent('deleteCache')
  async deleteCacheData(payload: any) {
    for (const key of payload.data.keys) {
      this.cacheManager.del(key)
    }
  }
}

export default MarketCapSearch
