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

export const query = gql`
  query ($unixtime: Int) {
    ipfshashs(where: { createdAt_gt: $unixtime }, orderBy: createdAt) {
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

  async getIPFSHashesFromBlock(unixtime: number): Promise<[Hash] | []> {
    const reqUrl = this.configService.get('graphUrl')
    let response
    try {
      response = await request(reqUrl, query, { unixtime })
    } catch (err: any) {
      console.error('GRAPH ERROR', JSON.stringify(err, null, 2))
    }
    if (response?.ipfshashs) {
      return response.ipfshashs.filter((hash: Hash) => hash.id.length === 46)
    }
    return []
  }
}

export default GraphProviderService
