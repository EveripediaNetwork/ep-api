import { CacheModule, Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'

import { TypeOrmModule } from '@nestjs/typeorm'
import HiIQHolderService from './hiIQHolder.service'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderRepository from './hiIQHolder.repository'
import HiIQHolderAddressRepository from './hiIQHolderAddress.repository'
import HiIQHoldersResolver from './hiIQHolder.resolver'

@Module({
  imports: [
    TypeOrmModule.forFeature([HiIQHolderAddress, HiIQHolder]),
    ScheduleModule.forRoot(),
    CacheModule.register({ ttl: 3600 }),
    HttpModule,
  ],
  providers: [
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
