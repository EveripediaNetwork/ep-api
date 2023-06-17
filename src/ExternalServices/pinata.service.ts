/* eslint-disable new-cap */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import pinataSDK from '@pinata/sdk'

@Injectable()
class PinataService {
  constructor(private configService: ConfigService) {}

  private getPinataSDK() {
    const key = this.configService.get<string>('IPFS_PINATA_KEY')
    const secret = this.configService.get<string>('IPFS_PINATA_SECRET')
    const sdk = new pinataSDK(key, secret)
    return sdk
  }

  private getPinataAUTH() {
    return this.configService.get<string>('IPFS_PINATA_BEARER_AUTH')
  }

  public getPinataInstance() {
    return this.getPinataSDK()
  }

  public pinataBearerAuth() {
    return this.getPinataAUTH()
  }
}

export default PinataService
