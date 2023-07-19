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

  getLeastRecordByDate = async () => {
    const recordByDate = await this.repo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })
    return recordByDate
  }

  retrieveBlockNumber = async (date: number) => {
    try {
      const url = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${date}&closest=before&apikey=${this.etherScanApiKey()}`
      const response = await fetch(url)
      const data = await response.json()
      return data.result
    } catch (e: any) {
      console.log(e)
      return null
    }
  }

  getLockBalance = async (blockNumber: number) => {
    try{
       const provider = new ethers.providers.JsonRpcProvider(this.provider())
      const iface = new ethers.utils.Interface(erc20Abi)
      const iq = new ethers.Contract(this.address().iq, iface, provider)
      const balanceWei = await iq.balanceOf(this.address().hiIQ, {
        blockTag: Number(blockNumber),
      })
      const balanceIQ = Number(balanceWei.toString()) / 10e17
      console.log(
        `IQ Token balance of ${
          this.address().hiIQ
        } at date ${blockNumber}: ${balanceIQ} IQ`,
      )
    }
    catch(e: any){
      console.log(e)
      return null
    }
  }


  @Cron(CronExpression.EVERY_10_SECONDS, {
    // disabled: this.enablePreviousDataCron(),
  })
  async test(): Promise<void> {
    const leastRecordByDate = await this.getLeastRecordByDate() 
    let unixTimestampSeconds = Math.floor(
      leastRecordByDate.length > 0
        ? leastRecordByDate[0].created.getTime() / 1000
        : new Date().setHours(0, 0, 0, 0) / 1000,
    )
    const limtReached =
      new Date(unixTimestampSeconds / 1000).getTime() ===
      new Date(1658188800000).getTime()
    if (!leastRecordByDate) {
      unixTimestampSeconds = new Date().setHours(0, 0, 0, 0)
      return
    }
    const oneDayInSeconds = 86400
    // if value, substract 1 day and get block number
    const oneDayBack = Math.floor(
      leastRecordByDate.length > 0
        ? unixTimestampSeconds - oneDayInSeconds
        : unixTimestampSeconds,
    )
    const blockNumberForQuery = await this.retrieveBlockNumber(oneDayBack)
    if(blockNumberForQuery === null) return 
    const previousLockedBalance = await this.getLockBalance(blockNumberForQuery)
    if(previousLockedBalance === null) return

    if(leastRecordByDate.length > 0){
      return
    }
    
    const previousDate = oneDayBack * 1000
    const incomingDate = new Date(previousDate)
    return
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
    return
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
