/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable, OnModuleInit } from '@nestjs/common'
import MarketCapService from './marketCap.service'
import { MarketCapInputs, RankType } from './marketcap.dto'

const pm2 = require('pm2')

@Injectable()
class MarketCapSearch implements OnModuleInit {
  private ROOT_PROCESS = false

  private pm2Ids = new Map()

  constructor(private marketCapService: MarketCapService) {}

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
      this.startCaching()
    }, 10000)
  }

  private async startCaching() {
    if (this.ROOT_PROCESS) {
      const tokens = await this.marketCapService.cgMarketDataApiCall({
        kind: RankType.TOKEN,
      } as MarketCapInputs)

      const nfts = await this.marketCapService.cgMarketDataApiCall({
        kind: RankType.TOKEN,
      } as MarketCapInputs)

      const tokenData = await this.marketCapService.getWikiData(
        tokens,
        RankType.TOKEN,
      )
      const nftData = await this.marketCapService.getWikiData(
        nfts,
        RankType.NFT,
      )
      console.log('CacheService initializing...')
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
      console.log('Initial caching completed')
    } else {
      console.log('CacheService not runnning')
    }
  }
}

export default MarketCapSearch
