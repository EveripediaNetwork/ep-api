import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import ActivityService from '../activity.service'
import PinResolver from './pin.resolver'
import PinService from './pin.service'
import PinJSONErrorWebhook from './webhookHandler/pinJSONErrorWebhook'

@Module({
  imports: [HttpModule],
  providers: [
    PinResolver,
    PinService,
    ActivityService,
    IPFSValidatorService,
    MetadataChangesService,
    PinJSONErrorWebhook,
  ],
})
export default class PinModule {}
