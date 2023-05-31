import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { ethers } from 'ethers'
import { DataSource } from 'typeorm'
import Wiki from '../../../Database/Entities/wiki.entity'
import RunCommand from '../../run.command'
import { Hash } from '../../Provider/graph.service'
import { BlockData, TxData, decodeABI } from '../indexerWehhook.dto'

@Injectable()
class IndexerWebhookService {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private indexerCommand: RunCommand,
  ) {}

  private signingKey() {
    return this.configService.get<string>('WEBHOOK_SIGNING_KEY')
  }

  async indexWebhook(eventData: BlockData): Promise<boolean> {
    console.log('Signature verified 🎟️')

    const { logs } = eventData

    if (logs.length === 0) {
      console.log('no event at this moment ♻️')
      return false
    }
    if (logs[0].transaction.status === 1) {
      const { transaction } = logs[0]
      const decodedLog = await this.decodeLog(transaction.logs[0])
      const user = decodedLog?.args[0]
      const ipfs = decodedLog?.args[1]

      const wiki = await this.isIpfsInserted(ipfs)

      if (!wiki) {
        const newHash = {
          id: ipfs,
          transactionHash: transaction.hash,
          userId: user,
          block: eventData.number,
        }

        await this.indexerCommand.indexHash(newHash as Hash, true)
        console.log('Indexing webhook event 📇')
      }
    }
    return true
  }

  async isValidSignatureForStringBody(
    body: string,
    signature: string,
  ): Promise<boolean> {
    const key = this.signingKey() as string
    let validation = false
    try {
      const hmac = crypto.createHmac('sha256', key)
      hmac.update(body, 'utf8')
      const digest = hmac.digest('hex')

      validation = signature === digest
    } catch (e) {
      console.error(e)
    }
    return validation
  }

  async decodeLog(log: TxData): Promise<ethers.utils.LogDescription | null> {
    let decoded = null
    try {
      const iface = new ethers.utils.Interface(decodeABI)
      decoded = iface.parseLog(log)
    } catch (e: any) {
      console.error('Error decoding log', e)
    }
    return decoded
  }

  async isIpfsInserted(ipfs: string): Promise<boolean> {
    const repo = this.dataSource.getRepository(Wiki)
    const wiki = await repo.findOneBy({
      ipfs,
    })
    return wiki !== null
  }
}

export default IndexerWebhookService
