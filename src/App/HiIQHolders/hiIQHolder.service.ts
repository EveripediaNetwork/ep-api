/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { decodeEventLog } from 'viem'
import HiIQHolderRepository from './hiIQHolder.repository'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderAddressRepository from './hiIQHolderAddress.repository'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import { stopJob } from '../StakedIQ/stakedIQ.utils'
import hiIQAbi from '../utils/hiIQAbi'

export const hiIQCOntract = '0x1bF5457eCAa14Ff63CC89EFd560E251e814E16Ba'

export type MethodType = {
  eventName: string
  args: {
    provider: string
    type?: bigint
  }
}

@Injectable()
class HiIQHolderService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private repo: HiIQHolderRepository,
    private iqHolders: HiIQHolderAddressRepository,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  private provider(): string {
    return this.configService.get<string>('PROVIDER_NETWORK') as string
  }

  private etherScanApiKey(): string {
    return this.configService.get<string>('etherScanApiKey') as string
  }

  async lastHolderRecord(): Promise<HiIQHolder[]> {
    return this.repo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })
  }

  async checkExistingHolders(
    address: string,
  ): Promise<HiIQHolderAddress | null> {
    return this.iqHolders.findOneBy({
      address,
    })
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkForNewHolders() {
    const job = this.schedulerRegistry.getCronJob('storeHiIQHolderCount')
    if (firstLevelNodeProcess() && !job) {
      await this.indexHIIQHolders()
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS, {
    name: 'storeHiIQHolderCount',
    disabled: true
  })
  async storeHiIQHolderCount() {
    const today = new Date()
    const oneDayBack = new Date(today)
    oneDayBack.setDate(oneDayBack.getDate() - 1)

    const job = this.schedulerRegistry.getCronJob('storeHiIQHolderCount')
    const jobRun = await stopJob(this.repo, job, oneDayBack)

    if (firstLevelNodeProcess() && !jobRun) {
      await this.indexHIIQHolders()
    }
  }

  async indexHIIQHolders() {
    const oneDayInSeconds = 86400
    const record = await this.lastHolderRecord()
    const previous = Math.floor(new Date(`${record[0]?.day}`).getTime() / 1000)
    const next = previous ? previous + oneDayInSeconds : undefined

    const logs =
      previous && next
        ? await this.getOldLogs(previous, next)
        : await this.getOldLogs()

    for (const log of logs) {
      try {
        const decodelog = decodeEventLog({
          abi: hiIQAbi,
          data: log.data,
          topics: log.topics,
        }) as unknown as MethodType

        // @ts-ignore
        if (decodelog.eventName === 'Deposit' && decodelog.args.type === 1n) {
          const existHolder = await this.checkExistingHolders(
            decodelog.args.provider,
          )
          if (!existHolder) {
            try {
              const newHolder = this.iqHolders.create({
                address: decodelog.args.provider,
              })
              await this.iqHolders.save(newHolder)
            } catch (e: any) {
              console.error(e.message)
            }
          }
        }
        if (decodelog.eventName === 'Withdraw') {
          const existHolder = await this.checkExistingHolders(
            decodelog.args.provider,
          )
          if (existHolder) {
            await this.iqHolders
              .createQueryBuilder()
              .delete()
              .from(HiIQHolderAddress)
              .where('address = :address', {
                address: decodelog.args.provider,
              })
              .execute()
          }
        }
      } catch (e: any) {
        console.log(e)
      }
    }

    const count = await this.iqHolders.createQueryBuilder().getCount()

    const newDay = next ? new Date(next * 1000).toISOString() : '2021-06-01' // contract start date
    const existCount = await this.repo.findOneBy({
      day: new Date(newDay),
    })

    if (!existCount) {
      const totalHolders = this.repo.create({
        amount: count,
        day: newDay,
        created: newDay,
        updated: newDay,
      })
      await this.repo.save(totalHolders)
      console.log(`hiIQ holder Count for day ${newDay} saved 📈`)
    }
  }

  async getOldLogs(previous?: number, next?: number) {
    const oneDayInSeconds = 86400
    const startTimestamp = 1622505600
    const endTimestamp = startTimestamp + oneDayInSeconds
    const key = this.etherScanApiKey()
    const rootUrl = `https://api${
      this.provider().includes('mainnet') ? '' : '-goerli'
    }`
    const buildUrl = (fallbackTimestamp: number, timestamp?: number) =>
      `${rootUrl}.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${
        timestamp || fallbackTimestamp
      }&closest=before&apikey=${key}`

    let blockNumberForQuery1
    let blockNumberForQuery2
    try {
      const [response1, response2] = await Promise.all([
        this.httpService.get(buildUrl(startTimestamp, previous)).toPromise(),
        this.httpService.get(buildUrl(endTimestamp, next)).toPromise(),
      ])

      blockNumberForQuery1 = response1?.data.result
      blockNumberForQuery2 = response2?.data.result
    } catch (e: any) {
      console.error('Error requesting block number', e.data)
    }

    const logsFor1Day = `${rootUrl}.etherscan.io/api?module=logs&action=getLogs&address=${hiIQCOntract}&fromBlock=${blockNumberForQuery1}&toBlock=${blockNumberForQuery2}&page=1&offset=1000&apikey=${key}`

    let logs
    try {
      const resp = await this.httpService.get(logsFor1Day).toPromise()
      logs = resp?.data.result
    } catch (e: any) {
      console.error('Error requesting log data', e)
    }

    return logs
  }
}
export default HiIQHolderService
