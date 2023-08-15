import { CacheModule, Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'

import { TypeOrmModule } from '@nestjs/typeorm'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'
import HiIQHolderService from './hiIQHolder.service'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderRepository from './hiIQHolder.repository'
import HiIQHolderAddressRepository from './hiIQHolderAddress.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([HiIQHolderAddress, HiIQHolder]),
    ScheduleModule.forRoot(),
    HttpModule,
    CacheModule.register({ ttl: 3600 }),
  ],
  providers: [
    HiIQHolderService,
    HiIQHolderRepository,
    HiIQHolderAddressRepository,
    AlchemyNotifyService,
  ],
  exports: [
    HiIQHolderService,
    HiIQHolderRepository,
    HiIQHolderAddressRepository,
  ],
})
export default class HiIQHolderModule {}
