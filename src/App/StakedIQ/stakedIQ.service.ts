import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'
import erc20Abi from '../utils/erc20Abi'
import StakedIQRepository from './stakedIQ.repository'

@Injectable()
class StakedIQService {
  constructor(
    private repo: StakedIQRepository,
    private configService: ConfigService,
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeIQStacked(): Promise<void> {
    const tvl = await this.getTVL()
    await this.repo.saveData(`${tvl}`)
  }

  async getTVL(): Promise<number> {
    const provider = new ethers.providers.JsonRpcProvider(this.provider())
    const iface = new ethers.utils.Interface(erc20Abi)
    const iq = new ethers.Contract(this.address().iq, iface, provider)

    const value = await iq.balanceOf(this.address().hiIQ)

    const tvl = Number(value.toString()) / 10e17
    return tvl
  }

  @Cron(CronExpression.EVERY_10_SECONDS, {
    // disabled: this.enablePreviousDataCron(),
  })
  async test(): Promise<void> {
    // Check db by date desc, get 1 if null, initiate get block for present date at 12am

    const leastRecordByDate = await this.repo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })

    const dateObject = new Date(leastRecordByDate[0].created)
    let unixTimestampSeconds = Math.floor(dateObject.getTime() / 1000)
    // console.log(leastRecordByDate)
    // console.log(unixTimestampSeconds)
    const limtReached =
      new Date(unixTimestampSeconds / 1000).getTime() ===
      new Date(1658188800000).getTime()
    if (!leastRecordByDate) {
      unixTimestampSeconds = new Date().setHours(0, 0, 0, 0)
      return
    }
    const oneDayInSeconds = 86400
    // if value, substract 1 day and get block number
    const oneDayBack = unixTimestampSeconds - oneDayInSeconds
    const url = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${oneDayBack}&closest=before&apikey=${this.etherScanApiKey()}`
    let blockNumberForQuery
    try {
      const response = await fetch(url)
      const data = await response.json()
      console.log(data)
      blockNumberForQuery = data.result
    } catch (e: any) {
      console.log(e)
    }
    console.log(blockNumberForQuery)
    // use block number to query for balance
    let previousLockedBalance
    try {
      const provider = new ethers.providers.JsonRpcProvider(this.provider())
      //   const blockNumber = await provider.getBlockNumber(17695109)
      const iface = new ethers.utils.Interface(erc20Abi)
      const iq = new ethers.Contract(this.address().iq, iface, provider)
      const balanceWei = await iq.balanceOf(this.address().hiIQ, {
        blockTag: Number(blockNumberForQuery),
      })

      // Convert the balance from wei to IQ tokens
      //   const balanceIQ = ethers.utils.formatUnits(balanceWei, 17) // Assuming 18 decimal places for IQ tokens
      const balanceIQ = Number(balanceWei.toString()) / 10e17

      console.log(
        `IQ Token balance of ${
          this.address().hiIQ
        } at date ${blockNumberForQuery}: ${balanceIQ} IQ`,
      )
      previousLockedBalance = balanceIQ
    } catch (error) {
      console.error('Error:', error)
    }
    const previousDate = oneDayBack * 1000
    const incomingDate = new Date(previousDate)
    // before store check that the incoming date has not been inserted then store value(insert record, use the date as created and updated) otherwise return
    const existingRecord = await this.repo
      .createQueryBuilder('staked_iq')
      .where('staked_iq.created >= to_timestamp(:previousDate)', {
        previousDate,
      })
      .getOne()
    if (limtReached) {
      return
    }
    console.log(existingRecord)
    if (!existingRecord) {
      const oldStackedValue = this.repo.create({
        amount: `${previousLockedBalance}`,
        created: incomingDate,
        updated: incomingDate,
      })
      await this.repo.save(oldStackedValue)
    }
  }
}
export default StakedIQService
