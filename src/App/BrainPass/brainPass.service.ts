/* eslint-disable new-cap */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import pinataSDK from '@pinata/sdk'
import { ethers, BigNumber } from 'ethers'
import { HttpService } from '@nestjs/axios'
import * as crypto from 'crypto'
import BrainPassDto, { brainPassAbi } from './brainPass.dto'
import BrainPassRepository from './brainPass.repository'
import { TxData } from '../../Indexer/IndexerWebhook/indexerWehhook.dto'

@Injectable()
class BrainPassService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private repo: BrainPassRepository,
  ) {}

  private pinata() {
    const key = this.configService.get<string>('IPFS_PINATA_KEY')
    const secret = this.configService.get<string>('IPFS_PINATA_SECRET')
    const sdk = new pinataSDK(key, secret)
    return sdk
  }

  private signingKey() {
    return this.configService.get<string>('NFT_WEBHOOK_SIGNING_KEY')
  }

  async decodeNFTEvent(log: TxData) {
    const iface = new ethers.utils.Interface(brainPassAbi)

    const data = iface.parseLog(log)

    const user = data?.args[0]
    const passId = BigNumber.from(data?.args[1]).toNumber()
    const tokenId = BigNumber.from(data?.args[2]).toNumber()
    const amount = BigNumber.from(data?.args[3]).toNumber()

    const decoded = {
      transactionName: data.name,
      nftId: tokenId,
      address: user,
      nftType: passId,
      value: amount,
      name: 'BRAINPASS',
      image:
        'https://gateway.pinata.cloud/ipfs/Qmb86L8mUphw3GzLPWXNTRIK1S4scBdj9cc2Sev3s8uLiB/0.png',
      attributes: [],
    }
    console.log(decoded)
    return decoded
  }

  async pinJsonToPinata(jsonData: any): Promise<any> {
    const pinataUrl = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'

    try {
      const response = await this.httpService
        .post(pinataUrl, jsonData)
        .toPromise()
      return response
    } catch (error) {
      throw new Error('Error pinning JSON to Pinata')
    }
  }

  async storeMintEvent(eventLog: any) {
    const log = eventLog.event.data.block.logs[0].transaction.logs[3]
    const data = await this.decodeNFTEvent(log)
    let hash

    if (data.transactionName === 'BrainPassBought') {
      const nftMetadata = {
        name: data.name,
        description: 'brainpass nft',
        id: data.nftId,
        attributes: [],
      }
      const { IpfsHash } = await this.pinata().pinJSONToIPFS(nftMetadata)
      hash = IpfsHash
    }
    const brainPassBought: BrainPassDto = {
      nftId: data.nftId,
      name: data.name,
      address: data.address,
      image: data.image,
      description: '',
      amount: data.value,
      transactionHash: eventLog.event.data.block.logs[0].transaction.hash,
      metadataHash: hash,
    }
    await this.repo.createBrainPass(brainPassBought)
  }

  async getPinataData(hash: string): Promise<any> {
    const pinataUrl = `https://gateway.pinata.cloud/ipfs/${hash}`
    let dat = {
      description: 'Edit Wikis For Life',
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

  async isValidSignatureForStringBody(
    body: string,
    signature: string,
  ): Promise<boolean> {
    const key = this.signingKey() as string
    let validation = false
    try {
      const hmac = crypto.createHmac('sha256', key)
      hmac.update(body, 'utf8')
      const digest = hmac.digest('hex')

      validation = signature === digest
    } catch (e) {
      console.error(e)
    }
    return validation
  }
}
export default BrainPassService
