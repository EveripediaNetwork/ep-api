import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'
import StakedIQ from '../../Database/Entities/stakedIQ.entity'
import StakedIQRepository from './stakedIQ.repository'
import StakedIQResolver from './stakedIQ.resolver'
import StakedIQService from './stakedIQ.service'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([StakedIQ]),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  providers: [
    StakedIQResolver,
    StakedIQService,
    StakedIQRepository,
    AlchemyNotifyService,
  ],
  exports: [StakedIQResolver, StakedIQService, StakedIQRepository],
})
export default class StakedIQModule {}
