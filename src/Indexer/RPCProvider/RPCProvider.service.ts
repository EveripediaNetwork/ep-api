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

  async processLogs(
    provider: ethers.providers.JsonRpcProvider,
    contract: ethers.Contract,
    filter: any,
    unixtime: number,
  ): Promise<Hash[]> {
    const logs = await provider.getLogs(filter)
    console.log(`Total logs: ${logs.length}`)

    const batchSize = 50
    const batches = []
    const batchResults = []

    for (let i = 0; i < logs.length; i += batchSize) {
      const start = i === 0 ? 1 : i
      const end = start + batchSize
      batches.push(logs.slice(start, end))
      if (batches.length === 5 || i === logs.length - 1) {
        const batchPromises = batches.map((batch, index) =>
          this.processLogBatch(provider, contract, batch, unixtime, index),
        )
        const results = await Promise.all(batchPromises)
        batchResults.push(...results)
      }
    }

    if (batches.length > 0) {
      const batchPromises = batches.map((batch, index) =>
        this.processLogBatch(provider, contract, batch, unixtime, index),
      )
      const results = await Promise.all(batchPromises)
      batchResults.push(...results)
    }

    return batchResults.flat().filter((hash): hash is Hash => hash !== null)
  }

  async processLogBatch(
    provider: ethers.providers.JsonRpcProvider,
    contract: ethers.Contract,
    batchLogs: any[],
    unixtime: number,
    batchIndex: number,
  ): Promise<Hash[]> {
    console.log(`Processing batch ${batchIndex + 1}: ${batchLogs.length} logs`)

    const logPromises = batchLogs.map((log) =>
      this.processLog(provider, contract, log, unixtime),
    )
    const results = await Promise.all(logPromises)
    return results.filter((result): result is Hash => result !== null)
  }

  async processLog(
    provider: ethers.providers.JsonRpcProvider,
    contract: ethers.Contract,
    log: any,
    unixtime: number,
  ): Promise<Hash | null> {
    const block = await provider.getBlock(log.blockHash)
    const parsedLog = contract.interface.parseLog(log)

    if (block && parsedLog && block.timestamp >= unixtime) {
      const user = parsedLog.args[0]
      const ipfs = parsedLog.args[1]

      return {
        id: ipfs,
        createdAt: block.timestamp,
        block: log.blockNumber,
        transactionHash: log.transactionHash,
        userId: user,
        contentId: `${log.transactionHash}-${log.logIndex}`,
      }
    }

    return null
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
      const results = await this.processLogs(
        provider,
        contract,
        filter,
        unixtime,
      )
      return results
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
