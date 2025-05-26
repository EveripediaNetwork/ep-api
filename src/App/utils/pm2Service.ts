/* eslint-disable @typescript-eslint/no-var-requires */
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

const pm2 = require('pm2')

@Injectable()
class Pm2Service {
  private pm2Ids = new Map()

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleInit() {
    console.log('Ai')
    setTimeout(() => {
      pm2.connect(() => {
        pm2.list((_err: unknown, list: any) => {
          for (const pm2Info of list) {
            this.pm2Ids.set(pm2Info.pm_id, pm2Info.name)
          }
          pm2.disconnect(() => {})
        })
      })
    }, 10000)
  }

  async sendDataToProcesses(
    processName: string,
    topic: string,
    data: any,
    ignoreId?: number,
  ) {
    for (const [k, v] of this.pm2Ids) {
      if (
        v === processName &&
        ((ignoreId && k !== ignoreId) || (k !== 0 && !ignoreId))
      ) {
        const processId = k
        await new Promise((r) => setTimeout(r, 800))
        pm2.connect((err: unknown) => {
          if (err) {
            console.error('Error connecting to PM2:', err)
            return
          }
          pm2.sendDataToProcessId(
            {
              id: processId,
              type: 'process:msg',
              topic,
              data,
            },
            () => {
              if (err) {
                console.error(
                  `TOPIC - { ${topic} } | Error sending data to process ${processId}:`,
                  err,
                )
              } else {
                console.log(
                  `TOPIC - { ${topic} } | Data successfully sent to process ${processId}`,
                )
              }
            },
          )
        })
      }
    }
  }

  @OnEvent('updateCache')
  async setCacheData(payload: any) {
    const data = JSON.parse(payload.data.data)
    await this.cacheManager.set(payload.data.key, data, payload.data.ttl)
  }

  @OnEvent('deleteCache')
  async deleteCacheData(payload: any) {
    for (const key of payload.data.keys) {
      this.cacheManager.del(key)
    }
  }
}

export default Pm2Service
