import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'

import { TypeOrmModule } from '@nestjs/typeorm'
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
  ],
  providers: [
    HiIQHolderService,
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
