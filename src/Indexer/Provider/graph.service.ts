import { Injectable, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { request, gql } from 'graphql-request'
import SentryInterceptor from '../../sentry/security.interceptor'

export type Hash = {
  id: string
  createdAt: number
  block: number
  transactionHash: string
  userId: string
  contentId: string
}

const query = gql`
  query ($unixtime: Int) {
    ipfshashs(where: { createdAt_gt: $unixtime }) {
      id
      block
      createdAt
      transactionHash
      userId
      contentId
    }
  }
`

@UseInterceptors(SentryInterceptor)
@Injectable()
class GraphProviderService {
  constructor(private configService: ConfigService) {}

  async getIPFSHashesFromBlock(unixtime: number): Promise<[Hash]> {
    // TODO: catch errors
    const reqUrl = this.configService.get('graphUrl')
    const response = await request(reqUrl, query, { unixtime })
    return response.ipfshashs.filter((hash: Hash) => hash.id.length === 46)
  }
}

export default GraphProviderService
