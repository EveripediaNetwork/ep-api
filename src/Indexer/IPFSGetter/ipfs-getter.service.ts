import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import config from '../../config'

@Injectable()
class IPFSGetterService {
  constructor(private httpService: HttpService) {}

  async getIPFSDataFromHash(hash: string): Promise<Record<string, unknown>> {
    const response = await this.httpService
      .get(config.ipfsUrl + hash)
      .toPromise()
    return response?.data
  }
}

export default IPFSGetterService
