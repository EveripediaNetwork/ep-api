import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import axios from 'axios'
import { request, gql } from 'graphql-request'
import Hash from './models/hashIndex.model'

interface GetHashs {
  ipfshashs: [{ id: string }]
}

@Injectable()
export default class IpfsHashService {
  constructor(
    @InjectModel(Hash)
    private hashIndexModel: typeof Hash,
  ) {}

  private async getHashes(arg: string, url: string): Promise<GetHashs> {
    return request(url, arg)
  }

  private async filterValidHashes(arg: any[]): Promise<any[]> {
    const ress: [{ id: string }] = [
      { id: 'QmUGs99gpmE2KKh454rs4DYvwrVLbq44i8DvWDqgBEy3Qs' },
    ]
    const result = arg.filter(
      (el: { id: string }) => el.id.length === 46 && el.id.startsWith('Qm'),
    )
    return ress.concat(result)
  }

  private async queryIpfs(arg: any[], url: string): Promise<any[]> {
    const queryPromise = []
    for (let i = 0; i < arg.length; i += 1) {
      queryPromise.push(axios.get(`${url}/${arg[i].id}`))
    }
    return Promise.all(queryPromise)
  }

  private queryUsers(arg: any[]): any[] {
    const validHashes: any[] = []
    arg.forEach((el: any) => {
      if ('user' in el.content === true) {
        validHashes.push(el)
      }
    })
    const result = []
    for (let i = 0; i < validHashes.length; i += 1) {
      result.push({
        user: validHashes[i].content.user,
        version: validHashes[i].version,
      })
    }
    return result
  }

  async indexHash(): Promise<any> {
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

    const { ipfshashs } = res

    const recess = await this.filterValidHashes(ipfshashs)

    const queryPromise = await this.queryIpfs(
      recess,
      'https://ipfs.io/ipfs',
      //   'https://gateway.pinata.cloud/ipfs',
    )

    const queryHash = queryPromise.map(el => el.data)

    const result = this.queryUsers(queryHash)

    const hashIndex = await this.hashIndexModel.create({
      userId: result[0].user.id,
      version: result[0].version,
      edited: true,
    })

    return hashIndex
  }
}
