import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'

import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'
import HiIQHolderService from './hiIQHolder.service'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  providers: [
    HiIQHolderService,
    AlchemyNotifyService,
  ],
  exports: [ HiIQHolderService],
})
export default class HiIQHolderModule {}
