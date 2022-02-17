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

@Injectable()
export default class IpfsHashService {
  constructor(
    @InjectModel(HashIndex)
    private hashIndexModel: typeof HashIndex,
  ) {}

  async indexHash(): Promise<HashIndex[]> {
    const query = gql`
      {
        ipfshashs {
          id
        }
      }
    `

    const res = await request(
      'https://api.thegraph.com/subgraphs/name/kesar/wiki-mumbai-v1',
      query,
    )

    // Filter valid ipfshashes
    const { ipfshashs } = res
    const ress: [{ id: string }] = [
      { id: 'QmUGs99gpmE2KKh454rs4DYvwrVLbq44i8DvWDqgBEy3Qs' },
    ]
    const result = ipfshashs.filter(
      (el: { id: string }) => el.id.length === 46 && el.id.startsWith('Qm'),
    )
    ress.concat(result)

    // Query ipfs
    const queryPromise = []
    for (let i = 0; i < ress.length; i += 1) {
      queryPromise.push(
        axios.get(`https://gateway.pinata.cloud/ipfs/${ress[i].id}`),
      )
    }

    let queryHash = await Promise.all(queryPromise)
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
