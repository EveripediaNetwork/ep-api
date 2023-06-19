import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import PinResolver from './pin.resolver'
import PinService from './pin.service'
import SecurityTestingService from '../utils/securityTester'
import PinataService from '../../ExternalServices/pinata.service'
import ActivityModule from '../Activities/activity.module'

@Module({
  imports: [
    HttpModule,
    ActivityModule,
  ],
  providers: [
    PinResolver,
    PinService,
    IPFSValidatorService,
    SecurityTestingService,
    MetadataChangesService,
    WebhookHandler,
    PinataService,
  ],
})
export default class PinModule {}
