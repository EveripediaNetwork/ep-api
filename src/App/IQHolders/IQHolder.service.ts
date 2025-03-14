/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'
import { DataSource } from 'typeorm'
import IQHolderRepository from './IQHolder.repository'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import IQHolderAddressRepository from './IQHolderAddress.repository'
import erc20Abi from '../utils/erc20Abi'
import IQHolderAddress from '../../Database/Entities/iqHolderAddress.entity'
import { stopJob } from '../StakedIQ/stakedIQ.utils'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import { LockingService } from './IQHolders.dto'
import ETHProviderService from '../utils/ethProviderService'

export const IQContract = '0x579CEa1889991f68aCc35Ff5c3dd0621fF29b0C9'

const cronIndexerId = 'storeIQHolderCount'
@Injectable()
class IQHolderService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private repo: IQHolderRepository,
    private dataSource: DataSource,
    private iqHolders: IQHolderAddressRepository,
    private schedulerRegistry: SchedulerRegistry,
    private ethProviderService: ETHProviderService,
    private readonly lockingService: LockingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async lastHolderRecord(): Promise<IQHolder[]> {
    return this.repo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })
  }

  async checkExistingHolders(address: string): Promise<IQHolderAddress | null> {
    return this.iqHolders.findOneBy({
      address,
    })
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkForNewHolders() {
    const job = this.schedulerRegistry.getCronJob('storeIQHolderCount')
    if (firstLevelNodeProcess() && !job) {
      await this.indexIQHolders()
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS, {
    name: cronIndexerId,
    disabled: true,
  })
  async storeIQHolderCount() {
    const tempStop: boolean | null | undefined =
      await this.cacheManager.get(cronIndexerId)

    const today = new Date()
    const oneDayBack = new Date(today)
    oneDayBack.setDate(oneDayBack.getDate() - 1)
    const job = this.schedulerRegistry.getCronJob('storeIQHolderCount')
    const jobRun = await stopJob(this.repo, job, oneDayBack)
    if (tempStop) return

    if (firstLevelNodeProcess() && !jobRun) {
      const lockAcquired = await this.lockingService.acquireLock(cronIndexerId)
      if (!lockAcquired) return

      await this.indexIQHolders()
    }
  }

  async indexIQHolders() {
    await this.ethProviderService.checkNetwork()
    const iface = new ethers.utils.Interface(erc20Abi)
    const iq = new ethers.Contract(
      IQContract,
      iface,
      this.ethProviderService.getRpcProvider(),
    )
    const oneDayInSeconds = 86400
    const record = await this.lastHolderRecord()
    const previous = Math.floor(new Date(`${record[0]?.day}`).getTime() / 1000)
    const next = previous ? previous + oneDayInSeconds : undefined

    const transactions =
      previous && next
        ? await this.getTxList(previous, next)
        : await this.getTxList()

    const addressesToDelete = new Set()
    const addressesToAdd = new Set()

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      if (transactions.length > 0)
        for (const transaction of transactions) {
          if (
            (transaction.functionName?.startsWith('transfer') ||
              transaction.functionName?.startsWith('approve')) &&
            transaction.txreceipt_status === '1'
          ) {
            const balance = await iq.balanceOf(transaction.from, {
              blockTag: Number(transaction.blockNumber),
            })

            const readableBalance = Number(balance.toString()) / 10e17

            const existHolder = await this.checkExistingHolders(
              transaction.from,
            )

            if (readableBalance > 0 && !existHolder) {
              addressesToAdd.add(transaction.from)
              if (addressesToDelete.has(transaction.from))
                addressesToDelete.delete(transaction.from)
            }
            if (readableBalance < 0 && existHolder) {
              addressesToDelete.add(transaction.from)
            }
          }
        }
      if (addressesToAdd.size > 0) {
        for (const address of addressesToAdd) {
          const newHolder = this.iqHolders.create({
            address: address as string,
          })
          await queryRunner.manager.save(newHolder)
        }
      }

      await queryRunner.commitTransaction()
    } catch (e: any) {
      console.log(e)
      await queryRunner.rollbackTransaction()
      await this.cacheManager.set(cronIndexerId, true, 900 * 1000)
      this.lockingService.releaseLock(cronIndexerId)
      await queryRunner.release()
      return
    }

    await queryRunner.release()

    if (addressesToDelete.size > 0) {
      for (const address of addressesToDelete) {
        await this.iqHolders
          .createQueryBuilder()
          .delete()
          .from(IQHolderAddress)
          .where('address = :address', {
            address,
          })
          .execute()
      }
    }

    const count = await this.iqHolders.createQueryBuilder().getCount()

    const newDay = next ? new Date(next * 1000).toISOString() : '2021-03-19' // contract start date
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
      console.log(`IQ holder Count of ${count} for day ${newDay} saved 📈`)
    }
    this.lockingService.releaseLock(cronIndexerId)
  }

  async getTxList(previous?: number, next?: number) {
    const oneDayInSeconds = 86400
    const startTimestamp = 1616112000
    const endTimestamp = startTimestamp + oneDayInSeconds
    const key = this.ethProviderService.etherScanApiKey()
    const mainnet = this.configService.get<string>('API_LEVEL') === 'prod'
    const buildUrl = (fallbackTimestamp: number, timestamp?: number) =>
      `https://api.etherscan.io/api?${
        !mainnet && 'chainid=11155111'
      }module=block&action=getblocknobytime&timestamp=${
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
    const transactionsFor1Day = `https://api.etherscan.io/api?${
      !mainnet && 'chainid=11155111'
    }module=account&action=txlist&address=${IQContract}&startBlock=${blockNumberForQuery1}&endBlock=${blockNumberForQuery2}&page=1&offset=1000&sort=asc&apikey=${key}`

    let transactions
    try {
      const resp = await this.httpService.get(transactionsFor1Day).toPromise()
      transactions = resp?.data.result
    } catch (e: any) {
      console.error('Error requesting log data', e)
    }

    return transactions
  }
}
export default IQHolderService
