/* eslint-disable @typescript-eslint/no-var-requires */
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
// import * as IPFS from 'ipfs-core'

const pinataSDK = require('@pinata/sdk')

// const pinata = pinataSDK(key, secret)

@Injectable()
class PinService {
  constructor(private configService: ConfigService) {}

  private pinata() {
      const key = this.configService.get<string>('ApiKey')
      const secret = this.configService.get<string>('ApiSecret')
      return pinataSDK(key, secret)
  }

  async pinImage(file: fs.PathLike): Promise<any> {
    
    const readableStreamForFile = fs.createReadStream(file)

    const pinImageToPinata = async (option: any) =>{
        this.pinata().pinFileToIPFS(option)
    }
    

    // const pinImageToIPFS = async () => {
    //   const ipfs = await IPFS.create()
    //   for await (const file of ipfs.addAll(
    //     IPFS.globSource('./uploads', '**/*'),
    //   )) {
    //     const result = { ...file, cid: file.cid.toString() }
    //     return result
    //   }
    // }

    try {
      const res = await pinImageToPinata(readableStreamForFile)
      return res
      //   return await pinImageToIPFS()
    } catch (e) {
      return e
    }
  }

  async pinJSON(body: string): Promise<any> {
    const data = JSON.parse(`${body}`)

    const payload = {
      pinataMetadata: {
        name: data.content !== undefined ? data.content.title : 'image',
      },
      pinataContent: {
        ...data,
      },
    }

    const pinToPinata = async (option: any) => {
        this.pinata().pinJSONToIPFS(option)
    }

    // const pinToIPFS = async (option: any): Promise<string> => {
    //   const ipfs = await IPFS.create()
    //   const { cid } = await ipfs.add(option)
    //   return cid.toString()
    // }
    try {
      const res = await pinToPinata(payload)
      return res
    } catch (e) {
      return e
    }
  }
}

export default PinService
