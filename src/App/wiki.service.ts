/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
// import * as IPFS from 'ipfs-core'
import config from '../config'

const pinataSDK = require('@pinata/sdk')

const pinata = pinataSDK(config.ApiKey, config.ApiSecret)

@Injectable()
class WikiService {
  async pinImage(file: fs.PathLike): Promise<any> {
    const readableStreamForFile = fs.createReadStream(file)

    const pinImageToPinata = async (option: any) => pinata.pinFileToIPFS(option)

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
    const json = body.replace(/'/g, '"')
    const data = JSON.parse(`${json}`)

    const payload = {
      pinataMetadata: {
        name: data.content !== undefined ? data.content.title : 'image',
      },
      pinataContent: {
        ...data,
      },
    }

    const pinToPinata = async (option: any) => pinata.pinJSONToIPFS(option)

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

export default WikiService
