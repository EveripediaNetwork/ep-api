import { Injectable } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'
import { HttpService } from '@nestjs/axios'
import erc20Abi from '../utils/erc20Abi'
import StakedIQRepository from './stakedIQ.repository'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import { existRecord, stopJob, getDates, insertOldData } from './stakedIQ.utils'
import ETHProviderService from '../utils/ethProviderService'

@Injectable()
class StakedIQService {
  constructor(
    private repo: StakedIQRepository,
    private configService: ConfigService,
    private httpService: HttpService,
    private schedulerRegistry: SchedulerRegistry,
    private ethProviderService: ETHProviderService,
  ) {}

  private address(): { hiIQ: string; iq: string } {
    return {
      hiIQ: this.configService.get<string>('HIIQ_ADDRESS') as string,
      iq: this.configService.get<string>('IQ_ADDRESS') as string,
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeIQStacked(): Promise<void> {
    if (firstLevelNodeProcess()) {
      const tvl = await this.getTVL()
      const presentData = await existRecord(new Date(), 'staked_iq', this.repo)
      if (!presentData) {
        await this.repo.saveData(`${tvl}`)
      }
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS, {
    name: 'IndexOldStakedIQ',
    disabled: true,
  })
  async indexOldStakedBalance(): Promise<void> {
    const job = this.schedulerRegistry.getCronJob('IndexOldStakedIQ')
    await stopJob(this.repo, job)

    const presentData = await existRecord(new Date(), 'staked_iq', this.repo)
    if (firstLevelNodeProcess()) {
      if (!presentData) {
        await this.previousStakedIQ()
      }
    }
  }

  async getTVL(block?: string): Promise<number> {
    await this.ethProviderService.checkNetwork()
    const iface = new ethers.utils.Interface(erc20Abi)
    const iq = new ethers.Contract(
      this.address().iq,
      iface,
      this.ethProviderService.getRpcProvider(),
    )

    const value = block
      ? await iq.balanceOf(this.address().hiIQ, { blockTag: Number(block) })
      : await iq.balanceOf(this.address().hiIQ)

    const tvl = Number(value.toString()) / 10e17
    return tvl
  }

  async previousStakedIQ(): Promise<void> {
    const { time, incomingDate } = await getDates(this.repo)

    const key = this.ethProviderService.etherScanApiKey()
    const mainnet = this.configService.get<string>('API_LEVEL') === 'prod'
    const url = `https://api.etherscan.io/api?${
      !mainnet && 'chainid=11155111'
    }module=block&action=getblocknobytime&timestamp=${time}&closest=before&apikey=${key}`

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
      previousLockedBalance = balanceIQ
    } catch (error) {
      console.error('Error retrieving balance:', error)
    }

    await insertOldData(
      previousLockedBalance as number,
      incomingDate,
      this.repo,
    )
  }
}
export default StakedIQService
