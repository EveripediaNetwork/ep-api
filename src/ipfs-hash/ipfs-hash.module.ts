import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import Hash from './models/hashIndex.model'
import IpfsHashService from './ipfs-hash.service'
import IpfsHashResolver from './ipfs-hash.resolver'

@Module({
  imports: [SequelizeModule.forFeature([Hash])],
  providers: [IpfsHashService, IpfsHashResolver],
})
export default class IpfsHashModule {}
