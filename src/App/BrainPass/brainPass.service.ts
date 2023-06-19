/* eslint-disable no-underscore-dangle */
/* eslint-disable new-cap */
import { Injectable } from '@nestjs/common'
import { BigNumber, ethers } from 'ethers'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import BrainPassDto, {
  BrainPassContractMethods,
  brainPassAbi,
} from './brainPass.dto'
import BrainPassRepository from './brainPass.repository'
import PinataService from '../../ExternalServices/pinata.service'
import AlchemyNotifyService, {
  TxData,
} from '../../ExternalServices/alchemyNotify.service'

@Injectable()
class BrainPassService {
  constructor(
    private configService: ConfigService,
    private alchemyNotifyService: AlchemyNotifyService,
    private httpService: HttpService,
    private pinataService: PinataService,
    private repo: BrainPassRepository,
  ) {}

  async getDefaultData() {
    const image = this.configService.get('BRAINPASS_DEFAULT_IMAGE')
    const description = this.configService.get('BRAINPASS_DEFAULT_DESCRIPTION')
    return { image, description }
  }

  async decodeNFTEvent(log: TxData) {
    const data = await this.alchemyNotifyService.decodeLog(log, brainPassAbi)
    const decoded = {
      tokenId: BigNumber.from(data?.args._tokenId).toNumber(),
      owner: data?.args._owner,
      passId: BigNumber.from(data?.args._passId).toNumber(),
      price: ethers.utils.formatEther(
        BigNumber.from(Number(data?.args._price).toString()),
      ),
      passName: data?.args._passName,
      transactionName: data?.name,
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

  async storeMintData(eventLog: any): Promise<any> {
    const { image, description } = await this.getDefaultData()

    const { logs, hash } = eventLog.transaction
    const data = await this.decodeNFTEvent(logs[logs.length - 2])

    let ipfshash

    if (data.transactionName === BrainPassContractMethods.MINT) {
      const nftMetadata = {
        name: `${data.passName}-${data.tokenId}`,
        description,
        image,
        id: data.tokenId,
        attributes: [],
      }
      const { IpfsHash } = await this.pinataService
        .getPinataInstance()
        .pinJSONToIPFS(nftMetadata)

      ipfshash = IpfsHash
    //   await this.updateHashMetadata({
    //     hash: IpfsHash,
    //     name: data.passName,
    //     tokenId: data.tokenId,
    //     passId: data.passId,
    //   })
    }
    const existTransaction = await this.repo.getBrainPassByTxHash(
      eventLog.transaction.hash,
    )
    if (!existTransaction) {
      const brainPassBought: BrainPassDto = {
        tokenId: data.tokenId,
        passName: data.passName,
        passId: data.passId,
        owner: data.owner,
        image,
        description,
        price: data.price,
        transactionHash: hash,
        metadataHash: ipfshash,
      }
      await this.repo.createBrainPass(brainPassBought)
    }
  }

  async getPinataData(hash: string): Promise<any> {
    const pinataUrl = `https://gateway.pinata.cloud/ipfs/${hash}`
    const { image, description } = await this.getDefaultData()
    let dat = {
      description,
      image,
      name: 'BrainPass',
      attributes: [],
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
