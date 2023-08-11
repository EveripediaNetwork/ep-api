import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import { createPublicClient, http, parseAbiItem, parseUnits } from 'viem'
import { mainnet } from 'viem/chains'
import { ConfigService } from '@nestjs/config'

@Injectable()
class HiIQHolderService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private etherScanApiKey(): string {
    return this.configService.get<string>('etherScanApiKey') as string
  }

  @Cron(CronExpression.EVERY_5_SECONDS, {
    name: 'IndexOldHiIQHolders',
  })
  async getLogs() {
    const time = 1691711940 // 10 at 11:59
    const newTime = 1691625540 // 9 at 11:59
    const key = this.etherScanApiKey()
    const url1 = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${time}&closest=before&apikey=${key}`
    const url2 = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${newTime}&closest=before&apikey=${key}`

    let blockNumberForQuery1
    let blockNumberForQuery2
    try {
      const response1 = await this.httpService.get(url1).toPromise()
      const response2 = await this.httpService.get(url2).toPromise()
      blockNumberForQuery1 = response1?.data.result
      blockNumberForQuery2 = response2?.data.result
    } catch (e: any) {
      console.error('Error requesting block number', e.data)
    }

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })

    if (BigInt(blockNumberForQuery2) && BigInt(blockNumberForQuery1)) {
      const logs = await publicClient.getLogs({
        address: '0x1bF5457eCAa14Ff63CC89EFd560E251e814E16Ba',
        event: parseAbiItem(
          'event Deposit(address indexed provider, uint256 value,uint256 locktime, int128 type, uint256 ts)',
        ),
        fromBlock: parseUnits(blockNumberForQuery1, 1),
        toBlock: parseUnits(blockNumberForQuery2, 1),
      })
      console.log(logs)
    }
    // const cleanData = []
    // for (const log of logs) {
    //   const address = log.args.provider
    //   const { data } = log
    //   const { topics } = log
    //   const decodedData = decodeEventLog({
    //     abi: hiIQAbi,
    //     data,
    //     topics,
    //   })
    //   const block = await publicClient.getBlock({
    //     blockNumber: log.blockNumber as bigint,
    //   })
    //   const timestamp = new Date(Number(block.timestamp * 1000n)).toUTCString()
    //   cleanData.push({ address, decodedData, timestamp })
    // }

    // return cleanData
  }
}
export default HiIQHolderService
