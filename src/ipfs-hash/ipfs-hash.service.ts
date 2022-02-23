import { Injectable } from '@nestjs/common'
// import { Cron } from '@nestjs/schedule'
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

  public async getHashes(arg: string, url: string): Promise<GetHashs> {
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
    let index = 0
    const queryPromise = []

    while (index < arg.length) {
      const limit = arg.splice(0, 18)
      for (let i = 0; i < limit.length; i += 1) {
        queryPromise.push(axios.get(`${url}/${limit[i].id}`))
      }
      index += limit.length
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
    return validHashes
  }

//   @Cron('*/10 * * * * *')
  async indexHash(): Promise<any> {
    const query = gql`
      {
        ipfshashs {
          id
        }
      }
    `
    const hashes = await this.getHashes(
      query,
      'https://api.thegraph.com/subgraphs/name/kesar/wiki-mumbai-v1',
    )

    const { ipfshashs } = hashes

    const validHashes = await this.filterValidHashes(ipfshashs)

    const response = await this.queryIpfs(
      validHashes,
      'https://ipfs.io/ipfs',
      //   'https://gateway.pinata.cloud/ipfs',
    )

    const wikiContent = response.map(el => el.data)

    const result = this.queryUsers(wikiContent)

    // const hashIndex = await this.hashIndexModel.create({
    //   userId: result[0].user.id,
    //   version: result[0].version,
    //   edited: true,
    // })
    console.log(result)
  }
}
