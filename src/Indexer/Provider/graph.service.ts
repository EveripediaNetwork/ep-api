import { Injectable } from '@nestjs/common'

@Injectable()
class GraphProviderService {
  getIPFSHashesFromBlock(block: number): [string] {
    // TODO: get array of ipfs hashesh from a block
    console.log(block)
    return ['']
  }
}

export default GraphProviderService
