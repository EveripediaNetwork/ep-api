import { Injectable } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'
import { HttpService } from '@nestjs/axios'
import erc20Abi from '../utils/erc20Abi'
import StakedIQRepository from './stakedIQ.repository'
import StakedIQ from '../../Database/Entities/stakedIQ.entity'

@Injectable()
class StakedIQService {
  constructor(
    private repo: StakedIQRepository,
    private configService: ConfigService,
    private httpService: HttpService,
    private schedulerRegistry: SchedulerRegistry
  ) {}

  private address(): { hiIQ: string; iq: string } {
    return {
      hiIQ: this.configService.get<string>('HIIQ_ADDRESS') as string,
      iq: this.configService.get<string>('IQ_ADDRESS') as string,
    }
  }

  private etherScanApiKey(): string {
    return this.configService.get<string>('etherScanApiKey') as string
  }

  private provider(): string {
    return this.configService.get<string>('PROVIDER_NETWORK') as string
  }

  public checkProcess() {
    return parseInt(process.env.NODE_APP_INSTANCE as string, 10) === 0
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeIQStacked(): Promise<void> {
    if (this.checkProcess()) {
      const tvl = await this.getTVL()
      const presentData = await this.existRecord(new Date())
      if (!presentData) {
        await this.repo.saveData(`${tvl}`)
      }
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS, {
    disabled: false,
    name: 'IndexOldStakedIQ',
  })
  async indexOldStakedBalance(): Promise<void> {
    const job = this.schedulerRegistry.getCronJob('IndexOldStakedIQ')
    // const present
    console.log('running')
    const presentData = await this.existRecord(new Date())
    if (this.checkProcess()) {
      if (!presentData) {
        await this.previousStakedIQ()
      }
    }

    if (true) {
      console.log('not running')
      job.stop()
    }
  }

  async getTVL(block?: string): Promise<number> {
    const provider = new ethers.providers.JsonRpcProvider(this.provider())
    const iface = new ethers.utils.Interface(erc20Abi)
    const iq = new ethers.Contract(this.address().iq, iface, provider)

    const value = block
      ? await iq.balanceOf(this.address().hiIQ, { blockTag: Number(block) })
      : await iq.balanceOf(this.address().hiIQ)

    const tvl = Number(value.toString()) / 10e17
    return tvl
  }

  async leastRecordByDate(): Promise<StakedIQ[] | []> {
    return this.repo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })
  }

  async previousStakedIQ(): Promise<void> {
    const oldRecord = await this.leastRecordByDate()

    const oneDayInSeconds = 86400
    let time
    if (oldRecord && oldRecord.length > 0) {
      const record = oldRecord[0].created
      time = Math.floor(new Date(record).getTime() / 1000) + oneDayInSeconds
    } else {
      time = 1658275200 // 1yr back 2022-07-20
    }

    const key = this.etherScanApiKey()
    const url = `https://api${
      this.provider().includes('mainnet') ? '' : '-goerli'
    }.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${time}&closest=before&apikey=${key}`

    let blockNumberForQuery
    try {
      const response = await this.httpService.get(url).toPromise()
      blockNumberForQuery = response?.data.result
    } catch (e: any) {
      console.error('Error requesting block number', e.data)
    }
    let previousLockedBalance
    try {
      const balanceIQ = (await this.getTVL(
        blockNumberForQuery,
      )) as unknown as number

      console.log(
        `IQ Token balance of ${
          this.address().hiIQ
        } at block ${blockNumberForQuery}: ${balanceIQ} IQ`,
      )
      previousLockedBalance = balanceIQ
    } catch (error) {
      console.error('Error retrieving balance:', error)
    }
    const previousDate = time * 1000
    const incomingDate = new Date(previousDate)
    await this.insertOldData(previousLockedBalance as number, incomingDate)
  }

  async existRecord(date: Date): Promise<StakedIQ | null> {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`
    return this.repo
      .createQueryBuilder('staked_iq')
      .where('staked_iq.created::DATE = :formattedDate', {
        formattedDate,
      })
      .getOne()
  }

  async insertOldData(balance: number, date: Date): Promise<void> {
    const oldStackedValue = this.repo.create({
      amount: `${balance}`,
      created: date,
      updated: date,
    })
    await this.repo.save(oldStackedValue)
    console.log('Previous staked data saved')
  }
}
export default StakedIQService
