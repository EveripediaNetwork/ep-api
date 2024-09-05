import { Injectable } from '@nestjs/common'
import Arweave from 'arweave'

@Injectable()
export class ArweaveService {
  private arweave: Arweave

  constructor() {
    this.arweave = Arweave.init({
      host: 'arweave.net',
      protocol: 'https',
      port: 443,
      timeout: 5000,
    })
  }

  async getTransactionData(transactionId: string): Promise<string> {
    const data = await this.arweave.transactions.getData(transactionId, {
      decode: true,
      string: true,
    })
    return data as string
  }
}
