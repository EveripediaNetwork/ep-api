import { Module } from '@nestjs/common'
import IpfsHashService from './ipfs-hash.service'

@Module({
  providers: [IpfsHashService],
})
export default class IpfsHashModule {}
