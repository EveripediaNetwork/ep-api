import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Arweave from 'arweave'

@Injectable()
class ArweaveService {
  private readonly arweave: Arweave

  constructor(private configService: ConfigService) {
    this.arweave = Arweave.init({
      host: 'arweave.net',
      protocol: 'https',
      port: 443,
      timeout: 5000,
    })
  }
}

export default ArweaveService
