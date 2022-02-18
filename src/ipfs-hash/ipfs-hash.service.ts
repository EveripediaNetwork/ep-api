import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import axios from 'axios'
import { request, gql } from 'graphql-request'
import HashIndex from './models/hashIndex.model'

interface Valid {
  id?: string
  content: {
    user?: {
      id?: string
    }
  }
}

interface GetHashs {
  ipfshashs: [{ id: string }]
}

@Injectable()
export default class IpfsHashService {
  constructor(
    @InjectModel(HashIndex)
    private hashIndexModel: typeof HashIndex,
  ) {}

  public async getHashes(arg: string, url: string): Promise<GetHashs> {
    return request(url, arg)
  }

  public async filterValidHashes(arg: any[]): Promise<any[]> {
    const ress: [{ id: string }] = [
      { id: 'QmUGs99gpmE2KKh454rs4DYvwrVLbq44i8DvWDqgBEy3Qs' },
    ]
    const result = arg.filter(
      (el: { id: string }) => el.id.length === 46 && el.id.startsWith('Qm'),
    )
    return ress.concat(result)
  }

  public async queryIpfs(arg: any[], url: string): Promise<any[]> {
    const queryPromise = []
    for (let i = 0; i < arg.length; i += 1) {
      queryPromise.push(axios.get(`${url}/${arg[i].id}`))
    }
    return Promise.all(queryPromise)
  }

  async indexHash(): Promise<HashIndex[]> {
    const query = gql`
      {
        ipfshashs {
          id
        }
      }
    `
    const res = await this.getHashes(
      query,
      'https://api.thegraph.com/subgraphs/name/kesar/wiki-mumbai-v1',
    )

    // Filter valid ipfshashes
    const { ipfshashs } = res

    const recess = await this.filterValidHashes(ipfshashs)

    // Query ipfs
    let queryHash = await this.queryIpfs(
      recess,
      // 'https://ipfs.io/ipfs',
      'https://gateway.pinata.cloud/ipfs',
    )
    queryHash = queryHash.map(el => el.data)

    // filter hashes with users only
    const validHashes: Valid[] = []
    queryHash.forEach((el: any) => {
      if ('user' in el.content === true) {
        validHashes.push(el)
      }
    })

    const hashIndex = await this.hashIndexModel.bulkCreate([])

    return hashIndex
  }
}
