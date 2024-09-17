import { CACHE_MANAGER, Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Cache } from 'cache-manager'
import MarketCapService from './marketCap.service'
import { MarketCapInputs, RankType } from './marketcap.dto'

@Injectable()
class MarketCapSearch implements OnModuleInit {
  private ROOT_PROCESS = false

  constructor(
    private marketCapService: MarketCapService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    setTimeout(() => {
      this.startCaching()
    }, 15000)
  }

  private async startCaching() {
    if (this.ROOT_PROCESS) {
      console.log('CacheService initializing...')
      const tokens = await this.marketCapService.cgMarketDataApiCall({
        kind: RankType.TOKEN,
      } as MarketCapInputs)

      const nfts = await this.marketCapService.cgMarketDataApiCall({
        kind: RankType.TOKEN,
      } as MarketCapInputs)

      await this.marketCapService.getWikiData(tokens, RankType.TOKEN)
      await this.marketCapService.getWikiData(nfts, RankType.NFT)

      console.log(tokens)
      console.log('Initial caching completed')
    } else {
      console.log('CacheService not runnning')
    }
  }
}

export default MarketCapSearch
