import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'
import erc20Abi from '../utils/erc20Abi'
import StakedIQRepository from './stakedIQ.repository'
import hiIQAbi from '../utils/hiIQAbi'

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
  async prevDataPoints() {
    // get initial date from first inserted in DB, convert to unix and use as timestamp
    const provider = new ethers.providers.JsonRpcProvider(this.provider())
    const iface = new ethers.utils.Interface(hiIQAbi as any)
    const contract = new ethers.Contract(this.address().hiIQ, iface, provider)
    const increaseAmount = 'increase_amount'
    // const createLock = 'create_lock'
    // const methods = [increaseAmount, createLock]
    // const timestamp = 1689246000 // Replace with your desired timestamp
    // contract.
    const startBlock = provider.getBlock(0)
    const currentBlock = provider.getBlock('latest')

    Promise.all([startBlock, currentBlock])
      .then(([fromBlock, toBlock]) => {
        const eventFilter = contract.filters[increaseAmount]()
        // eventFilter.fromBlock  = fromBlock
        // eventFilter.toBlock = toBlock
        // console.log(contract.queryFilter(eventFilter))
        return contract.queryFilter(eventFilter)
      })
      .then(pastEvents => {
        pastEvents.forEach(event => {
          console.log('Past event:', event)
          // Process the past event data as needed
        })
      })
      .catch(error => {
        console.error('Error:', error)
      })

    // insert received value in DB using the the previous date from the initial insert record as the created and updated, repeat the process to a specific day
  }
}
export default StakedIQService
