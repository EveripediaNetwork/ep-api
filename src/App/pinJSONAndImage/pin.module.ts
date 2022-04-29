import { Module } from '@nestjs/common'
import ActivityService from '../activity.service'
import PinResolver from './pin.resolver'
import PinService from './pin.service'

@Module({
  providers: [PinResolver, PinService, ActivityService],
})
export default class PinModule {}
