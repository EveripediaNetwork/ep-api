/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-mutable-exports */
import { Injectable } from '@nestjs/common'
import { Cron, CronExpression, type SchedulerRegistry } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { decodeEventLog, erc20Abi } from 'viem'
import { ethers } from 'ethers'
import HiIQHolderRepository from './hiIQHolder.repository'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderAddressRepository from './hiIQHolderAddress.repository'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import { stopJob } from '../StakedIQ/stakedIQ.utils'
import hiIQAbi from '../utils/hiIQAbi'
import HiIQHolderArgs from './hiIQHolders.dto'
import { IntervalByDays } from '../general.args'
import { HiIQHoldersRankArgs } from '../pagination.args'

export const hiIQCOntract = '0x1bF5457eCAa14Ff63CC89EFd560E251e814E16Ba'

export type MethodType = {
  eventName: string
  args: {
    provider: string
    type?: bigint
    ts?: bigint
    value?: bigint
  }
}

@Injectable()
class HiIQHolderService {
  private HIIQ_CONTRACT_START_TIMESTAMP = 1622505600

  private TWENTY_HOURS_IN_SECONDS = 86400

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private hiIQHoldersRepo: HiIQHolderRepository,
    private hiIQHoldersAddressRepo: HiIQHolderAddressRepository,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  private providerUrl(): string {
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

  async lastUpdatedHiIQHolder(): Promise<HiIQHolderAddress[]> {
    return this.hiIQHoldersAddressRepo.find({
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
  async dailyHiIQHolders() {
    const job = this.schedulerRegistry.getCronJob('dailyHiIQHolders')
    if (firstLevelNodeProcess() && !job) {
      await this.indexHIIQHolders('dailyHiIQHolders')
    }
  }

  @Cron('*/2 * * * * *', {
    name: 'storeHiIQHolderCount',
  })
  async storeHiIQHolderCount() {
    const job = this.schedulerRegistry.getCronJob('storeHiIQHolderCount')
    await stopJob(this.hiIQHoldersRepo, job)

    if (
      firstLevelNodeProcess() &&
      this.configService.get<string>('API_LEVEL') === 'prod'
    ) {
      await this.indexHIIQHolders('storeHiIQHolderCount')
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'intermittentCheck',
  })
  async intermittentCheck() {
    const job = this.schedulerRegistry.getCronJob('storeHiIQHolderCount')
    if (
      firstLevelNodeProcess() &&
      !job.running &&
      this.configService.get<string>('API_LEVEL') === 'prod'
    ) {
      await this.indexHIIQHolders('intermittentCheck', true)
    }
  }

  async indexHIIQHolders(jobName: string, intermittentCheck = false) {
    const job = this.schedulerRegistry.getCronJob(jobName)
    job.stop()
    const oneDayInSeconds = 86400

    const record = await this.lastHolderRecord()
    const lastUpdatedHolder = await this.lastUpdatedHiIQHolder()

    const previous = intermittentCheck
      ? Math.floor(new Date(`${lastUpdatedHolder[0].updated}`).getTime()) /
          1000 -
        600
      : Math.floor(new Date(`${record[0]?.day}`).getTime() / 1000)
    const next = previous ? previous + oneDayInSeconds : undefined

    const logs =
      previous && next
        ? await this.getOldLogs(previous, next)
        : await this.getOldLogs(
            this.HIIQ_CONTRACT_START_TIMESTAMP,
            this.HIIQ_CONTRACT_START_TIMESTAMP + this.TWENTY_HOURS_IN_SECONDS,
          )

    const rpcProvider = new ethers.providers.JsonRpcProvider(this.providerUrl())

    if (logs.length !== 0) {
      for (const log of logs) {
        try {
          const decodelog = decodeEventLog({
            abi: hiIQAbi,
            data: log.data,
            topics: log.topics,
          }) as unknown as MethodType
          const tokenContract = new ethers.Contract(
            hiIQCOntract,
            erc20Abi,
            rpcProvider,
          )
          if (decodelog.eventName === 'Deposit') {
            const { provider, value } = decodelog.args
            if (value !== undefined) {
              const existingHolder = await this.checkExistingHolders(provider)
              const timestamp = Number.parseInt(log.timeStamp, 16)
              const logTime = new Date(timestamp * 1000).toISOString()
              const balance = await tokenContract.balanceOf(provider)
              const [decimals] = await Promise.all([
                tokenContract.decimals(),
                tokenContract.symbol(),
              ])
              const formattedBalance = ethers.utils.formatUnits(
                balance,
                decimals,
              )
              if (existingHolder && formattedBalance !== '0.0') {
                await this.hiIQHoldersAddressRepo
                  .createQueryBuilder()
                  .update(HiIQHolderAddress)
                  .set({ tokens: formattedBalance, updated: logTime })
                  .where('address = :address', {
                    address: existingHolder.address,
                  })
                  .execute()
              }
              if (!existingHolder && formattedBalance !== '0.0') {
                try {
                  const newHolder = this.hiIQHoldersAddressRepo.create({
                    address: provider,
                    tokens: `${formattedBalance}`,
                    updated: logTime,
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
        } catch (error: any) {
          if (error.message !== 'topics is not iterable') {
            console.log(error.message, intermittentCheck)
          }
        }
      }
    }

    const count = await this.hiIQHoldersAddressRepo
      .createQueryBuilder()
      .getCount()
    const newDay = next ? new Date(next * 1000).toISOString() : '2021-06-01' // contract start date

    if (intermittentCheck) {
      console.log('intermittent checks')
      const existCount = await this.hiIQHoldersRepo.findOneBy({
        day: new Date(),
      })

      if (!existCount) {
        const totalHolders = this.hiIQHoldersRepo.create({
          amount: count,
          day: new Date(),
          created: new Date(),
          updated: new Date(),
        })
        await this.hiIQHoldersRepo.save(totalHolders)
        console.log(`hiIQ holder Count for day ${newDay} saved 📈`)
      }
      if (existCount && count !== existCount.amount) {
        await this.hiIQHoldersRepo
          .createQueryBuilder()
          .update(HiIQHolder)
          .set({ amount: count })
          .where('day = :day', { day: existCount.day })
          .execute()
        console.log(
          `hiIQ holder count for present day: updated value: ${count}  ${
            existCount.amount > count ? '🔴' : '🟢'
          } `,
        )
      }
    } else {
      console.log('indexing')
      const existCount = await this.hiIQHoldersRepo.findOneBy({
        day: new Date(newDay),
      })

      if (!existCount && new Date(newDay) <= new Date()) {
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
    job.start()
  }

  async getOldLogs(previous: number, next: number) {
    const key = this.etherScanApiKey()
    const buildUrl = (fallbackTimestamp: number) =>
      `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${fallbackTimestamp}&closest=before&apikey=${key}`

    let blockNumberForQuery1
    let blockNumberForQuery2
    try {
      const [response1, response2] = await Promise.all([
        this.httpService.get(buildUrl(previous)).toPromise(),
        this.httpService.get(buildUrl(next)).toPromise(),
      ])

      blockNumberForQuery1 = response1?.data.result
      blockNumberForQuery2 = response2?.data.result
    } catch (e: any) {
      console.error('Error requesting block number', e.data)
    }

    const logsFor1Day = `https://api.etherscan.io/api?module=logs&action=getLogs&address=${hiIQCOntract}&fromBlock=${blockNumberForQuery1}&toBlock=${blockNumberForQuery2}&page=1&offset=1000&apikey=${key}`

    let logs
    try {
      const resp = await this.httpService.get(logsFor1Day).toPromise()
      logs = resp?.data.result
    } catch (e: any) {
      console.error('Error requesting log data', e)
    }
    return logs
  }

  async hiIQHoldersRank(
    args: HiIQHoldersRankArgs,
  ): Promise<HiIQHolderAddress[]> {
    const repo = await this.hiIQHoldersAddressRepo
      .createQueryBuilder()
      .orderBy('tokens', args.direction)
      .skip(args.offset)
      .take(args.limit)
      .getMany()
    return repo
  }

  async getHiIQHoldersGraph(args: HiIQHolderArgs): Promise<HiIQHolder[]> {
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

  async getHiIQHoldersCount() {
    return this.hiIQHoldersRepo
      .createQueryBuilder('hi_iq_holder')
      .orderBy('created', 'DESC')
      .limit(1)
      .getMany()
  }

  async searchHiIQHoldersByAddress(
    address: string,
  ): Promise<HiIQHolderAddress | null> {
    const normalizedAddress = address.toLowerCase()

    const hiIQHolderAddress = await this.hiIQHoldersAddressRepo
      .createQueryBuilder('hi_iq_holder_address')
      .where('LOWER(address) = LOWER(:address)', {
        address: normalizedAddress,
      })
      .getOne()

    if (!hiIQHolderAddress) {
      return null
    }

    return hiIQHolderAddress
  }
}
export default HiIQHolderService
