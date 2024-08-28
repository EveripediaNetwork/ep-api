import { Injectable } from '@nestjs/common'
import * as pm2 from 'pm2'
import axios from 'axios'

@Injectable()
export class CacheService {
  private cache: any = null

  constructor() {
    this.syncCache()
  }

  async getCache(): Promise<any> {
    if (!this.cache) {
      await this.fetchCache()
    }
    return this.cache
  }

  private async fetchCache() {
    try {
      const response = await axios.get('https://')
      this.cache = response.data
      this.broadcastCache()
    } catch (error) {
      console.error('Error fetching cache data:', error)
    }
  }

  private broadcastCache() {
    pm2.connect((err) => {
      if (err) {
        console.error('PM2 connection error:', err)
        return
      }

      pm2.list((err, processes) => {
        if (err) {
          console.error('PM2 list error:', err)
          return
        }

        processes.forEach((process) => {
          if (process.pm_id !== undefined) {
            pm2.sendDataToProcessId(
              process.pm_id,
              {
                type: 'cache-update',
                data: this.cache,
                topic: 'cache',
              },
              (err: Error, res: any) => {
                if (err) {
                  console.error('Error sending data to process:', err)
                } else {
                  console.log('Data sent successfully to process', res)
                }
              },
            )
          }
        })

        pm2.disconnect()
      })
    })
  }

  private syncCache() {
    pm2.launchBus((err, bus) => {
      if (err) {
        console.error('PM2 bus launch error:', err)
        return
      }

      bus.on('cache-update', (packet: { data: any }) => {
        this.cache = packet.data
        console.log(
          `Process ${process.env.pm_id} received cache data:`,
          this.cache,
        )
      })
    })
  }
}
