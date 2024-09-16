import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Arweave from 'arweave'

@Injectable()
class ArweaveService {
  private readonly arweave: Arweave

  constructor(private configService: ConfigService) {
    this.arweave = Arweave.init({
      host: this.configService.get('ARWEAVE_HOST'),
      port: this.configService.get('ARWEAVE_PORT'),
      protocol: this.configService.get('ARWEAVE_PROTOCOL'),
      timeout: this.configService.get('ARWEAVE_TIMEOUT'),
    })
  }

  async getData(
    id: string,
    options?: { decode?: boolean; string?: boolean },
  ): Promise<string | Uint8Array> {
    try {
      const data = await this.arweave.transactions.getData(id, options)
      return data
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching data from Arweave: ${error.message}`)
      } else {
        console.error(
          'An unknown error occurred while fetching data from Arweave',
        )
      }
      throw error
    }
  }
}

export default ArweaveService
