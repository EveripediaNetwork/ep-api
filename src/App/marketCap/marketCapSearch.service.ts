/* eslint-disable @typescript-eslint/no-var-requires */
import { CACHE_MANAGER, Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron } from '@nestjs/schedule'
import MarketCapService from './marketCap.service'
import { MarketCapInputs, RankType } from './marketcap.dto'

const pm2 = require('pm2')

@Injectable()
class MarketCapSearch implements OnModuleInit {
  private ROOT_PROCESS = false

  private pm2Ids = new Map()

  constructor(
    private marketCapService: MarketCapService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    if (Number(process.env.pm_id) === 0) {
      this.ROOT_PROCESS = true
    }

    pm2.connect(() => {
      pm2.list((_err: unknown, list: any) => {
        for (const pm2Info of list) {
          this.pm2Ids.set(pm2Info.pm_id, pm2Info.name)
        }
        pm2.disconnect(() => {})
      })
    })

    setTimeout(() => {
      this.buildRankpageSearchData()
    }, 10000)
  }

  @OnEvent('buildSearchData', { async: true })
  @Cron('*/3 * * * *')
  private async buildRankpageSearchData() {
    if (this.ROOT_PROCESS) {
      console.log('Fetching marketcap search data')
      const tokens = await this.marketCapService.marketData({
        kind: RankType.TOKEN,
      } as MarketCapInputs)

      const nfts = await this.marketCapService.marketData({
        kind: RankType.NFT,
      } as MarketCapInputs)

      const tokenData = await this.marketCapService.getWikiData(
        tokens,
        RankType.TOKEN,
      )
      const nftData = await this.marketCapService.getWikiData(
        nfts,
        RankType.NFT,
      )
      for (const [k, v] of this.pm2Ids) {
        if (k !== 0 && v === 'ep-api') {
          const processId = k
          pm2.connect((err: unknown) => {
            if (err) {
              console.error('Error connecting to PM2:', err)
              return
            }

            pm2.sendDataToProcessId(
              {
                id: processId,
                type: 'process:msg',
                topic: 'searchCache',
                data: {
                  tokens: tokenData,
                  nfts: nftData,
                },
              },
              () => {
                if (err) {
                  console.error(
                    `Error sending data to process ${processId}:`,
                    err,
                  )
                } else {
                  console.log(`Data successfully sent to process ${processId}`)
                }
              },
            )
          })
        }
      }

      await this.cacheManager.set(
        'marketCapSearch',
        {
          tokens,
          nfts,
        },
        { ttl: 300 },
      )
      console.log('Initial caching completed')
    } else {
      console.log('Rankpage search cache service not runnning')
    }
  }
}

export default MarketCapSearch
