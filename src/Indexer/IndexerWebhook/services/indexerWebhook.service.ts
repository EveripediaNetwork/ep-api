import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import Wiki from '../../../Database/Entities/wiki.entity'
import RunCommand from '../../run.command'
import { Hash } from '../../Provider/graph.service'
import AlchemyNotifyService from '../../../ExternalServices/alchemyNotify.service'
import {
  BlockData,
  decodeABI,
} from '../../../ExternalServices/alchemyNotify.dto'
import { firstLevelNodeProcess } from '../../../App/Treasury/treasury.dto'

@Injectable()
class IndexerWebhookService {
  constructor(
    private alchemyNotifyService: AlchemyNotifyService,
    private dataSource: DataSource,
    private indexerCommand: RunCommand,
  ) {}

  async indexWebhook(eventData: BlockData): Promise<void> {
    console.log('Signature verified 🎟️ for Wiki')

    const { logs } = eventData

    if (logs.length > 0 && logs[0].transaction.status === 1) {
      const { transaction } = logs[0]
      const decodedLog = await this.alchemyNotifyService.decodeLog(
        transaction.logs[0],
        decodeABI,
      )
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

        if (firstLevelNodeProcess()) {
          await this.indexerCommand.saveToDB(newHash as Hash, true, false)
          console.log('Indexing webhook Wiki event 📇')
        }
      }
    }
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
