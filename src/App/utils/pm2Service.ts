/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable, OnModuleInit } from '@nestjs/common'

const pm2 = require('pm2')

@Injectable()
class Pm2Service implements OnModuleInit {
  private pm2Ids = new Map()

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
        await new Promise((r) => setTimeout(r, 300))
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
}

export default Pm2Service
