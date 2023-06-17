/* eslint-disable new-cap */
import { Injectable } from '@nestjs/common'
import { BigNumber, ethers } from 'ethers'
import { HttpService } from '@nestjs/axios'
import BrainPassDto, { brainPassAbi } from './brainPass.dto'
import BrainPassRepository from './brainPass.repository'
import PinataService from '../../ExternalServices/pinata.service'
import AlchemyNotifyService, {
  TxData,
} from '../../ExternalServices/alchemyNotify.service'

@Injectable()
class BrainPassService {
  constructor(
    private alchemyNotifyService: AlchemyNotifyService,
    private httpService: HttpService,
    private pinataService: PinataService,
    private repo: BrainPassRepository,
  ) {}

  async decodeNFTEvent(log: TxData) {
    const data = await this.alchemyNotifyService.decodeLog(
      log,
      brainPassAbi,
    )

    const owner = data?.args[0]
    const passName = data?.args[1]
    const price = ethers.utils.formatEther(
      BigNumber.from(Number(data?.args[2]).toString()),
    )
    const passId = BigNumber.from(data?.args[3]).toNumber()
    const tokenId = BigNumber.from(data?.args[4]).toNumber()
    const decoded = {
      tokenId,
      owner,
      passId,
      price,
      passName,
      transactionName: data?.name,
      image:
        'https://gateway.pinata.cloud/ipfs/Qmb86L8mUphw3GzLPWXNTRIK1S4scBdj9cc2Sev3s8uLiB/0.png',
      attributes: [],
    }
    return decoded
  }

  async updateHashMetadata(hash: any) {
    const data = JSON.stringify({
      ipfsPinHash: hash,
      name: 'passName',
      keyvalues: {
        tokeId: 'tokenId',
        passId: 'passId',
      },
    })

    const config = {
      headers: {
        Authorization: this.pinataService.pinataBearerAuth() as string,
        'Content-Type': 'application/json',
      },
    }

    try {
      const response = await this.httpService
        .put('https://api.pinata.cloud/pinning/hashMetadata', data, config)
        .toPromise()
      console.log(response?.data)
    } catch (error) {
      console.error(error)
    }
  }

  async storeMintData(eventLog: any) {
    const data = await this.decodeNFTEvent(eventLog.transaction.logs[3])

    let hash

    if (data.transactionName === 'BrainPassBought') {
      const nftMetadata = {
        name: data.passName,
        description: 'brainpass nft',
        id: data.tokenId,
        attributes: [],
      }
      const { IpfsHash } = await this.pinataService
        .getPinataInstance()
        .pinJSONToIPFS(nftMetadata)

      hash = IpfsHash
      //   await this.updateHashMetadata({
      //     hash: IpfsHash,
      //     name: data.passName,
      //     tokenId: data.tokenId,
      //     passId: data.passId,
      //   })
    }
    const brainPassBought: BrainPassDto = {
      tokenId: data.tokenId,
      passName: data.passName,
      passId: data.passId,
      owner: data.owner,
      image: data.image,
      description: '',
      price: data.price,
      transactionHash: eventLog.transaction.hash,
      metadataHash: hash,
    }
    await this.repo.createBrainPass(brainPassBought)
  }

  async getPinataData(hash: string): Promise<any> {
    const pinataUrl = `https://gateway.pinata.cloud/ipfs/${hash}`
    let dat = {
      description: 'Brainpass for wiki edits',
      image:
        'https://ipfs.io/ipfs/QmQqHUeQJXVA2x88Se7g1ZcbtEvWKRiMbhdSE6FggMK1Kf',
      name: 'GeneralBrainPass-1',
      attributes: [
        {
          display_type: 'boost_percentage',
          trait_type: 'Subscription Days',
          value: 30,
        },
      ],
    }
    try {
      const response = await this.httpService.get(pinataUrl).toPromise()
      dat = response?.data
    } catch (error: any) {
      console.error(error.message, '-- Error retrieving Pinata data')
    }
    return dat
  }
}
export default BrainPassService
