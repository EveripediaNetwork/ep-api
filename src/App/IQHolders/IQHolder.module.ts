import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'

import { TypeOrmModule } from '@nestjs/typeorm'
import IQHolderService from './IQHolder.service'
import IQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import IQHolder from '../../Database/Entities/hiIQHolder.entity'
import IQHolderRepository from './IQHolder.repository'
import IQHolderAddressRepository from './IQHolderAddress.repository'
import IQHoldersResolver from './IQHolder.resolver'
import { LockingService } from './IQHolders.dto'

@Module({
  imports: [
    TypeOrmModule.forFeature([IQHolderAddress, IQHolder]),
    ScheduleModule.forRoot(),
    CacheModule.register({ ttl: 3600 * 1000 }),
    HttpModule,
  ],
  providers: [
    IQHolderService,
    IQHoldersResolver,
    IQHolderRepository,
    IQHolderAddressRepository,
    LockingService,
  ],
  exports: [IQHolderService, IQHolderRepository, IQHolderAddressRepository],
})
export default class IQHolderModule {}
