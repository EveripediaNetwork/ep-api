/* eslint-disable no-console */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { request, gql } from 'graphql-request'

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

@Injectable()
class GraphProviderService {
  constructor(private configService: ConfigService) {}

  async getIPFSHashesFromBlock(unixtime: number): Promise<[Hash]> {
    const reqUrl = this.configService.get('graphUrl')
    let response
    try {
      response = await request(reqUrl, query, { unixtime })
    } catch (err: any) {
      console.error('GRAPH ERROR', JSON.stringify(err, null, 2))
    }
    return (response.ipfshashs ?? []).filter((hash: Hash) => hash.id.length === 46)
  }
}

export default GraphProviderService
