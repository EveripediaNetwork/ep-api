import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'
import erc20Abi from '../utils/erc20Abi'
import StakedIQRepository from './stakedIQ.repository'
import hiIQAbi from '../utils/hiIQAbi'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'

@Injectable()
class StakedIQService {
  constructor(
    private repo: StakedIQRepository,
    private configService: ConfigService,
    private alchemyNotifyService: AlchemyNotifyService,
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
    const eventName = 'create_lock'

    // Get the block number of the latest block
    const latestBlockNumber = await provider.getBlockNumber()

    // Set the starting and ending blocks for querying events
    const fromBlock = 0 // Start from the genesis block (or any desired block number)
    const toBlock = latestBlockNumber

    // Create the event filter
    const eventFilter = contract.filters[eventName]()

    // Get the events using the event filter and block range
    const events = await contract.queryFilter(eventFilter, fromBlock, toBlock)

    events.forEach(async (event) => {
      console.log(event)
      // const decoded = await this.alchemyNotifyService.decodeLog(event.data, hiIQAbi)
      // console.log('Event:', event);
      // Process the event data as needed
    })

    // const eventFilter = {
    //   address: this.address().hiIQ,
    //   topics: [ethers.utils.id('Increase_amount')],
    // }
    // console.log(eventFilter)

    // const result = await contract.queryFilter(eventFilter)

    // console.log(result)

    // const createLock = 'create_lock'
    // const methods = [increaseAmount, createLock]
    // const timestamp = 1689246000 // Replace with your desired timestamp
    // contract.
    // const startBlock = provider.getBlock(0)
    // const currentBlock = provider.getBlock('latest')

    // const eventFilter = contract.filters.increase_amount()
    // console.log(eventFilter)

    // Promise.all([startBlock, currentBlock])
    //   .then(([fromBlock, toBlock]) => {
    //     const eventFilter = contract.filters[increaseAmount]()
    //     // eventFilter.fromBlock  = fromBlock
    //     // eventFilter.toBlock = toBlock
    //     console.log(contract.queryFilter(eventFilter))
    //     return contract.queryFilter(eventFilter)
    //   })
    //   .then(pastEvents => {
    //     pastEvents.forEach(event => {
    //       console.log('Past event:', event)
    //       // Process the past event data as needed
    //     })
    //   })
    //   .catch(error => {
    //     console.error('Error:', error)
    //   })
  }
}
export default StakedIQService
