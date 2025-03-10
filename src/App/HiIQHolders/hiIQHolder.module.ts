import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'

import { TypeOrmModule } from '@nestjs/typeorm'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderRepository from './hiIQHolder.repository'
import HiIQHolderAddressRepository from './hiIQHolderAddress.repository'
import HiIQHoldersResolver from './hiIQHolder.resolver'
import HiIQHolderService from './hiIQHolder.service'
import ETHProviderService from '../utils/ethProviderService'

@Module({
  imports: [
    TypeOrmModule.forFeature([HiIQHolderAddress, HiIQHolder]),
    HttpModule,
  ],
  providers: [
    ETHProviderService,
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
