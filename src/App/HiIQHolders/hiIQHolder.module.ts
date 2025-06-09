import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'

import { TypeOrmModule } from '@nestjs/typeorm'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderRepository from './hiIQHolder.repository'
import HiIQHolderAddressRepository from './hiIQHolderAddress.repository'
import HiIQHoldersResolver from './hiIQHolder.resolver'
import HiIQHolderService from './hiIQHolder.service'
import BlockchainProviderService from '../utils/BlockchainProviderService'

@Module({
  imports: [
    TypeOrmModule.forFeature([HiIQHolderAddress, HiIQHolder]),
    HttpModule,
  ],
  providers: [
    BlockchainProviderService,
    HiIQHolderService,
    HiIQHoldersResolver,
    HiIQHolderRepository,
    HiIQHolderAddressRepository,
  ],
  exports: [
    HiIQHolderService,
    HiIQHolderRepository,
    HiIQHolderAddressRepository,
  ],
})
export default class HiIQHolderModule {}
