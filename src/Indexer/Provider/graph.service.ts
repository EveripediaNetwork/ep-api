import { Injectable } from '@nestjs/common'
import { request, gql } from 'graphql-request'
import config from '../../config'

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
  async getIPFSHashesFromBlock(unixtime: number): Promise<[Hash]> {
    // TODO: catch errors
    const response = await request(config.graphUrl, query, { unixtime })
    return response.ipfshashs.filter((hash: Hash) => hash.id.length === 46)
  }
}

export default GraphProviderService
