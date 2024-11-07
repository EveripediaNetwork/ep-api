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
import HiIQHolderArgs from './hiIQHolders.dto'
import { IntervalByDays } from '../general.args'
import { OrderArgs } from '../pagination.args'

export const hiIQCOntract = '0x1bF5457eCAa14Ff63CC89EFd560E251e814E16Ba'

export type MethodType = {
  eventName: string
  args: {
    provider: string
    type?: bigint
    value?: bigint
  }
}

@Injectable()
class HiIQHolderService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private hiIQHoldersRepo: HiIQHolderRepository,
    private hiIQHoldersAddressRepo: HiIQHolderAddressRepository,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  private provider(): string {
    return this.configService.get<string>('PROVIDER_NETWORK') as string
  }

  private etherScanApiKey(): string {
    return this.configService.get<string>('etherScanApiKey') as string
  }

  async lastHolderRecord(): Promise<HiIQHolder[]> {
    return this.hiIQHoldersRepo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })
  }

  async checkExistingHolders(
    address: string,
  ): Promise<HiIQHolderAddress | null> {
    return this.hiIQHoldersAddressRepo.findOneBy({
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
  })
  async storeHiIQHolderCount() {
    const today = new Date()
    const oneDayBack = new Date(today)
    oneDayBack.setDate(oneDayBack.getDate() - 1)

    const job = this.schedulerRegistry.getCronJob('storeHiIQHolderCount')
    const jobRun = await stopJob(this.hiIQHoldersRepo, job, oneDayBack)

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

        if (decodelog.eventName === 'Deposit' && decodelog.args.type === 1n) {
          const { provider, value } = decodelog.args

          if (value !== undefined) {
            const existingHolder = await this.checkExistingHolders(provider)

            if (existingHolder) {
              existingHolder.tokens = (
                BigInt(existingHolder.tokens) + value
              ).toString()

              await this.hiIQHoldersAddressRepo.save(existingHolder)
            } else {
              try {
                const newHolder = this.hiIQHoldersAddressRepo.create({
                  address: provider,
                  tokens: value.toString(),
                })
                await this.hiIQHoldersAddressRepo.save(newHolder)
              } catch (e: any) {
                console.error(e.message)
              }
            }
          } else {
            console.error('Value is undefined for event:', decodelog)
          }
        }
        if (decodelog.eventName === 'Withdraw') {
          const existHolder = await this.checkExistingHolders(
            decodelog.args.provider,
          )
          if (existHolder) {
            await this.hiIQHoldersAddressRepo
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

    const count = await this.hiIQHoldersAddressRepo
      .createQueryBuilder()
      .getCount()

    const newDay = next ? new Date(next * 1000).toISOString() : '2021-06-01' // contract start date
    const existCount = await this.hiIQHoldersRepo.findOneBy({
      day: new Date(newDay),
    })

    if (!existCount) {
      const totalHolders = this.hiIQHoldersRepo.create({
        amount: count,
        day: newDay,
        created: newDay,
        updated: newDay,
      })
      await this.hiIQHoldersRepo.save(totalHolders)
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

  async hiIQHoldersRank(args: OrderArgs): Promise<HiIQHolderAddress[]> {
    const repo = await this.hiIQHoldersAddressRepo
      .createQueryBuilder()
      .orderBy('tokens', args.direction)
      .skip(args.offset)
      .take(args.limit)
      .getMany()
    return repo
  }

  async getHiIQHoldersCount(args: HiIQHolderArgs): Promise<HiIQHolder[]> {
    if (args.interval !== IntervalByDays.DAY) {
      return this.hiIQHoldersRepo.query(
        `
            WITH RankedData AS (
            SELECT
                amount, day,
                ROW_NUMBER() OVER (ORDER BY day) AS row_num
            FROM hi_iq_holder
            )
            SELECT amount, day
            FROM RankedData
            WHERE (row_num - 1) % $1 = 0
            ORDER BY day
            OFFSET $2
            LIMIT $3;
        `,
        [args.interval, args.offset, args.limit],
      )
    }
    return this.hiIQHoldersRepo
      .createQueryBuilder('hi_iq_holder')
      .select('amount')
      .addSelect('day')
      .offset(args.offset)
      .limit(args.limit)
      .getRawMany()
  }
}
export default HiIQHolderService
