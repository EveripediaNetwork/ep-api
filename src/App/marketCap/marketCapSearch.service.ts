import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PubSub } from 'graphql-subscriptions'
import { gql } from 'graphql-request'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import MarketCapService from './marketCap.service'
import { MarketCapInputs, RankType, TokenCategory } from './marketcap.dto'
import Pm2Service from '../utils/pm2Service'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'

export const query = gql`
  query {
    hiIQHoldersCount {
      amount
    }
  }
`

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
    setTimeout(() => {
      this.pubSub.publish('marketCapSearchSubscription', {
        marketCapSearchSubscription: false,
      })
      this.buildRankpageSearchData()
      console.log('Starting API rate limit tester...')
    }, 15000)
  }

  @OnEvent('buildSearchData', { async: true })
  @Cron(CronExpression.EVERY_5_MINUTES)
  private async buildRankpageSearchData() {
    if (firstLevelNodeProcess()) {
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

      this.cacheManager.set('marketCapSearch', data)

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
    await this.cacheManager.set(payload.data.key, data, payload.data.ttl * 1000)
  }

  @OnEvent('deleteCache')
  async deleteCacheData(payload: any) {
    for (const key of payload.data.keys) {
      this.cacheManager.del(key)
    }
  }
}

export default MarketCapSearch
