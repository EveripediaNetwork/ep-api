import { Injectable, UseInterceptors } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Wiki as WikiType } from '@everipedia/iq-utils'
import SentryInterceptor from '../../sentry/security.interceptor'

@UseInterceptors(SentryInterceptor)
@Injectable()
class IPFSGetterService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async getIPFSDataFromHash(hash: string): Promise<WikiType> {
    const response = await this.httpService
      .get(this.configService.get('ipfsUrl') + hash)
      .toPromise()
    return response?.data
  }
}

export default IPFSGetterService
