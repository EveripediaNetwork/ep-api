import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'

import { IWiki } from '../../types/IWiki'

@Injectable()
class IPFSGetterService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async getIPFSDataFromHash(hash: string): Promise<IWiki> {
    const response = await this.httpService
      .get(this.configService.get('ipfsUrl') + hash)
      .toPromise()
    return response?.data
  }
}

export default IPFSGetterService
