/* eslint-disable @typescript-eslint/no-var-requires */
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

const pm2 = require('pm2')

export enum Pm2Events {
  UPDATE_CACHE = 'updateCache',
  DELETE_CACHE = 'deleteCache',
  BLOG_REQUEST_DATA = 'blogRequestData',
  BLOG_SEND_DATA = 'blogSendData',
  STATS_REQUEST_DATA = 'statsRequestData',
  STATS_SEND_DATA = 'statsSendData',
  BUILD_RANK_SEARCH_DATA = 'buildSearchData',
}

@Injectable()
class Pm2Service {
  private readonly logger = new Logger(Pm2Service.name)

  private pm2Ids = new Map()

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleInit() {
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
    topic: string,
    data: any,
    ignoreId?: number | string,
    id?: number,
    processName = 'ep-api',
  ) {
    const process = (processId: number) => {
      pm2.connect((err: unknown) => {
        if (err) {
          this.logger.error('Error connecting to PM2:', err)
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
              this.logger.error(
                `TOPIC - { ${topic} } | Error sending data to process ${processId}:`,
                err,
              )
            } else {
              this.logger.log(
                `TOPIC - { ${topic} } | Data successfully sent to process ${processId}`,
              )
            }
          },
        )
      })
    }
    if (String(ignoreId) && ignoreId === 'all') {
      return process(0)
    }
    if (String(ignoreId) && ignoreId === 'one' && id) {
      return process(id)
    }
    for (const [k, v] of this.pm2Ids) {
      if (
        v === processName &&
        ((ignoreId && k !== ignoreId) || (k !== 0 && !ignoreId))
      ) {
        const processId = k
        // await new Promise(r => setTimeout(r, 800))
        process(processId)
      }
    }
    return 0
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
