/* eslint-disable @typescript-eslint/naming-convention */
import { Controller, HttpStatus, Post, Req, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { ethers } from 'ethers'
import { DataSource } from 'typeorm'
import Wiki from '~/../src/Database/Entities/wiki.entity'
import { Hash } from '../../Provider/graph.service'
import RunCommand from '../../run.command'

type TxData = {
  account: { address: string }
  data: string
  topics: string[]
  index: number
}

const decodeABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: '_ipfs',
        type: 'string',
      },
    ],
    name: 'Posted',
    type: 'event',
  },
]

@Controller('indexer')
class IndexerWebhookController {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private indexerCommand: RunCommand,
  ) {}

  private signingKey() {
    return this.configService.get<string>('WEBHOOK_SIGNNING_KEY')
  }

  @Post()
  async initiateStore(
    @Req() request: any,
    @Res() res: Response,
    @Body() value: any,
  ) {
    const signature = request.headers['x-alchemy-signature']
    const key = this.signingKey()
    const validateRequest = await this.isValidSignatureForStringBody(
      JSON.stringify(value),
      signature,
      key,
    )

    if (validateRequest) {
      const eventData = value.event.data.block
      const { logs } = eventData
      if (eventData.transaction.status === 1) {
        const decodedLog = await this.decodeLog(logs[0])
        const user = decodedLog.args[0]
        const ipfs = decodedLog.args[1]
        const wiki = await this.isIpfsInserted(ipfs)

        if (!wiki) {
          const newHash = {
            id: ipfs,
            transactionHash: eventData.transaction.hash,
            userId: user,
            block: eventData.number,
          }

          await this.indexerCommand.indexHash(newHash as Hash, true)
        }
      }

      return res.status(HttpStatus.OK).json({ indexing: true })
    }
    return res.status(HttpStatus.BAD_REQUEST).json({ indexing: false })
  }

  async isValidSignatureForStringBody(
    body: string,
    signature: string,
    signingKey = 'whsec_test',
  ): Promise<boolean> {
    const hmac = crypto.createHmac('sha256', signingKey)
    hmac.update(body, 'utf8')
    const digest = hmac.digest('hex')

    return signature === digest
  }

  async decodeLog(log: TxData): Promise<ethers.utils.LogDescription> {
    const iface = new ethers.utils.Interface(decodeABI)
    return iface.parseLog(log)
  }

  async isIpfsInserted(ipfs: string): Promise<boolean> {
    const repo = this.dataSource.getRepository(Wiki)
    const wiki = await repo.findOneBy({
      ipfs,
    })
    return wiki !== null
  }
}
export default IndexerWebhookController
