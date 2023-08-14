import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Cron, CronExpression } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'

export const hiIQCOntract = '0x1bF5457eCAa14Ff63CC89EFd560E251e814E16Ba'

export enum HiIQMethods {
  CREATE_LOCK = '0x65fc3873',
  WITHDRAW = '0x3ccfd60b',
}

@Injectable()
class HiIQHolderService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private provider(): string {
    return this.configService.get<string>('PROVIDER_NETWORK') as string
  }

  private etherScanApiKey(): string {
    return this.configService.get<string>('etherScanApiKey') as string
  }

  async lastHolderRecord(): Promise<Date | number> {
    return 2
  }

  async checExistingHolders(address: string): Promise<any | null> {
    return null
  }

  @Cron(CronExpression.EVERY_5_SECONDS, {
    name: 'IndexOldHiIQHolders',
  })
  async getLogw() {
    // const oneDayInSeconds = 86400
    const stk = 'startTimestamp'
    const etk = 'endTimestamp'
    const previous: number | undefined = await this.cacheManager.get(stk)
    // const previous = await this.lastHolderCount().day
    const next: number | undefined = await this.cacheManager.get(etk)

    const logs = await this.oldLogs(previous as number, next as number)

    const provider = new ethers.providers.JsonRpcProvider(this.provider())

    logs.forEach(async (log: any) => {
      try {
        const dp = await provider.getTransaction(log.transactionHash)

        if (dp.data.startsWith(HiIQMethods.CREATE_LOCK)) {
          const existHolder = await this.checExistingHolders(dp.from)
          if (!existHolder) {
            // insert record in list of holders table
          }
          console.log(dp)
        }
        if (dp.data.startsWith(HiIQMethods.WITHDRAW)) {
          const existHolder = await this.checExistingHolders(dp.from)
          if (existHolder) {
            // remove address from db
          }
          console.log(dp)
        }
      } catch (e) {
        console.log(e)
      }
    })
    // set count of holders for that day using next as upper limit
  }

  async oldLogs(previous: number, next: number) {
    const oneDayInSeconds = 86400

    const startTimestamp = 1622541600 // contract creation 2021-06-01
    let endTimestamp = startTimestamp + oneDayInSeconds

    const stk = 'startTimestamp'
    const etk = 'endTimestamp'

    const key = this.etherScanApiKey()
    const url1 = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${
      previous || startTimestamp
    }&closest=before&apikey=${key}`
    const url2 = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${
      next || endTimestamp
    }&closest=before&apikey=${key}`

    let blockNumberForQuery1
    let blockNumberForQuery2
    try {
      const response1 = await this.httpService.get(url1).toPromise()
      const response2 = await this.httpService.get(url2).toPromise()
      blockNumberForQuery1 = response1?.data.result
      blockNumberForQuery2 = response2?.data.result
    } catch (e: any) {
      console.error('Error requesting block number', e.data)
    }
    console.log('blocknumber', blockNumberForQuery1, blockNumberForQuery2)

    const logsFor1Day = `https://api.etherscan.io/api?module=logs&action=getLogs&address=${hiIQCOntract}&fromBlock=${blockNumberForQuery1}&toBlock=${blockNumberForQuery2}&page=1&offset=1000&apikey=${key}`

    let logs
    try {
      const resp = await this.httpService.get(logsFor1Day).toPromise()
      logs = resp?.data.result
      //   console.log(resp?.data.result)
    } catch (e: any) {
      console.error('Error requesting log data', e)
    }
    await this.cacheManager.del(stk)
    await this.cacheManager.del(etk)
    if (!previous && !next) {
      await this.cacheManager.set(stk, endTimestamp)
      await this.cacheManager.set(etk, (endTimestamp += oneDayInSeconds))
    } else {
      const e = next + oneDayInSeconds
      await this.cacheManager.set(stk, next)
      await this.cacheManager.set(etk, e)
    }
    return logs
  }
}
export default HiIQHolderService
