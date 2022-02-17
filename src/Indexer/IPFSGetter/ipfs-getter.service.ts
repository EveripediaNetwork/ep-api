import { Injectable } from '@nestjs/common'

@Injectable()
class IPFSGetterService {
  getIPFSDataFromHash(hash: string): Record<string, unknown> {
    // TODO: get json object from an ipfs hash. fix return
    console.log(hash)
    return {}
  }
}

export default IPFSGetterService
