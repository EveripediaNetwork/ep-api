import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'
import { HttpService } from '@nestjs/axios'
import WikiAbi from '../../Relayer/utils/wiki.abi'
import { Hash } from '../Provider/graph.service'
import { TWENTY_FOUR_HOURS_AGO } from '../indexerUtils'

@Injectable()
class RPCProviderService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private provider(): { URL: string; CHAIN: string } {
    const values = JSON.parse(
      this.configService.get<string>('RPC_INDEXER') as string,
    )
    return values
  }

  async getBlockByTimestamp(
    chain = 'polygon',
    timestamp = TWENTY_FOUR_HOURS_AGO,
  ) {
    let block = 0
    try {
      const response = await this.httpService
        .get(`https://coins.llama.fi/block/${chain}/${timestamp}`)
        .toPromise()
      block = response?.data.height
      return block
    } catch (e) {
      console.error(e)
      return block
    }
  }

  async getHashesFromLogs(
    unixtime: number,
    blockNumber?: number,
    tx?: string,
  ): Promise<Hash[] | []> {
    const contractAddress = this.configService.get<string>(
      'WIKI_CONTRACT_ADDRESS',
    ) as string
    const provider = new ethers.providers.JsonRpcProvider(this.provider().URL)
    const contract = new ethers.Contract(contractAddress, WikiAbi, provider)
    let startBlock: string | number | undefined = blockNumber

    if (!startBlock) {
      const chain =
        this.provider().CHAIN === 'matic' ? 'polygon' : this.provider().CHAIN
      startBlock = await this.getBlockByTimestamp(chain)
    }

    if (tx && this.provider().CHAIN === 'iq') {
      const oldTx = await this.checkTransaction(tx)
      if (oldTx.status !== '1') {
        startBlock = 'earliest'
      }
    }

    const filter = {
      address: contractAddress,
      fromBlock: startBlock,
    }

    try {
      const logs = await provider.getLogs(filter)
      const limitedLogs = logs.slice(1, 51) // Limit logs to 50

      const hashes: Hash[] = []
      for (const log of limitedLogs) {
        const hash: Hash = {
          id: '',
          createdAt: 0,
          block: 0,
          transactionHash: '',
          userId: '',
          contentId: '',
        }

        const block = await provider.getBlock(log.blockHash)
        const parsedLog = contract.interface.parseLog(log)
        if (block && parsedLog && block.timestamp >= unixtime) {
          const user = parsedLog.args[0]
          const ipfs = parsedLog.args[1]

          hash.block = log.blockNumber
          hash.contentId = `${log.transactionHash}-${log.logIndex}`
          hash.transactionHash = log.transactionHash
          hash.id = ipfs
          hash.userId = user
          hash.createdAt = block.timestamp

          hashes.push(hash)
        }
      }
      return hashes
    } catch (e) {
      console.error('ERROR GETTING LOGS', e)
      return []
    }
  }

  async checkTransaction(tx: string) {
    try {
      const r = await this.httpService
        .get(
          `https://testnet.braindao.org/api?module=transaction&action=gettxinfo&txhash=${tx}`,
        )
        .toPromise()
      return r?.data
    } catch (e) {
      console.error(e)
      return { message: 'Transaction not found', result: null, status: '0' }
    }
  }
}

export default RPCProviderService
