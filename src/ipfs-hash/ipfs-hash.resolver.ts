import { Query, Resolver } from '@nestjs/graphql'
import HashIndex from './dto/hashIndex.dto'
import IpfsHashService from './ipfs-hash.service'

@Resolver(() => HashIndex)
export default class IpfsHashResolver {
  constructor(private readonly ipfsHashService: IpfsHashService) {}

  @Query(() => HashIndex)
  async getAllIndices(): Promise<any> {
    return this.ipfsHashService.indexHash()
  }
}
