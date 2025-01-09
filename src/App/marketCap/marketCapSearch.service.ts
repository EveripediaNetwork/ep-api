import { CACHE_MANAGER, Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PubSub } from 'graphql-subscriptions'
import { gql } from 'graphql-request'
// import { ConfigService } from '@nestjs/config'
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

  //   private attempts = 0

  constructor(
    private marketCapService: MarketCapService,
    private pm2Service: Pm2Service,
    // private configService: ConfigService,
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
      //   this.testRateLimit()
    }, 15000)
  }

  //   async testRateLimit(): Promise<void> {
  //     const url = 'http://localhost:8000/graphql' // Replace with your API URL

  //     while (true) {
  //       try {
  //         await request(url, query)
  //         this.attempts += 1
  //       } catch (err: any) {
  //         console.error('GRAPH ERROR', JSON.stringify(err, null, 2))
  //         console.error(`Error on attempt #${this.attempts}:`)
  //         break
  //       }

  //       //   try {
  //       //     this.attempts += 1
  //       //     const response = await axios.get(url)
  //       //     console.log(`Attempt #${this.attempts}: Status ${response.status}`)

  //       //     // Optional: Add custom logic if the API indicates rate limiting in the response body
  //       //     if (response.data && response.data.rateLimitReached) {
  //       //       console.log('Rate limit reached in response body.')
  //       //       break
  //       //     }
  //       //   } catch (error) {
  //       //     if (axios.isAxiosError(error)) {
  //       //       const axiosError = error as AxiosError

  //       //       // Check for rate limiting status code (e.g., 429)
  //       //       if (axiosError.response && axiosError.response.status === 429) {
  //       //         console.log('Rate limit reached: 429 Too Many Requests')
  //       //         break
  //       //       }

  //       //       console.error(
  //       //         `Error on attempt #${this.attempts}:`,
  //       //         axiosError.message,
  //       //       )
  //       //     } else {
  //       //       console.error(`Unexpected error on attempt #${this.attempts}:`, error)
  //       //     }
  //       //   }
  //     }

  //     // console.log(`Stopped after ${this.attempts} attempts due to rate limit.`)
  //   }

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

      this.cacheManager.set('marketCapSearch', data, 300)

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
