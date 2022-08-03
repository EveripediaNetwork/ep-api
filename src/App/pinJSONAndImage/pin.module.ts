import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import ActivityService from '../activity.service'
import PinResolver from './pin.resolver'
import PinService from './pin.service'

@Module({
    imports: [HttpModule],
  providers: [PinResolver, PinService, ActivityService, IPFSValidatorService],
})
export default class PinModule {}
