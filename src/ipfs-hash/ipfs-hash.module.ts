import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import Hash from './models/hashIndex.model'
import IpfsHashService from './ipfs-hash.service'

@Module({
  imports: [
    SequelizeModule.forFeature([Hash]),
  ],
  providers: [IpfsHashService],
})
export default class IpfsHashModule {}
