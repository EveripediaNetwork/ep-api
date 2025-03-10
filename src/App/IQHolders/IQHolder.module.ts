import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { HttpModule } from '@nestjs/axios'

import { TypeOrmModule } from '@nestjs/typeorm'
import IQHolderService from './IQHolder.service'
import IQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import IQHolder from '../../Database/Entities/hiIQHolder.entity'
import IQHolderRepository from './IQHolder.repository'
import IQHolderAddressRepository from './IQHolderAddress.repository'
import IQHoldersResolver from './IQHolder.resolver'
import { LockingService } from './IQHolders.dto'
import ETHProviderService from '../utils/ethProviderService'

@Module({
  imports: [
    TypeOrmModule.forFeature([IQHolderAddress, IQHolder]),
    CacheModule.register({ ttl: 3600 * 1000 }),
    HttpModule,
  ],
  providers: [
    ETHProviderService,
    IQHolderService,
    IQHoldersResolver,
    IQHolderRepository,
    IQHolderAddressRepository,
    LockingService,
  ],
  exports: [IQHolderService, IQHolderRepository, IQHolderAddressRepository],
})
export default class IQHolderModule {}
