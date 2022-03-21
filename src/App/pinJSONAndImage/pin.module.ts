import { Module } from '@nestjs/common'
import PinResolver from './pin.resolver'
import PinService from './pin.service'

@Module({
  providers: [PinResolver, PinService],
})
export default class PinModule {}
