import { CacheModule, Module } from '@nestjs/common'
import httpModule from '../../httpModule'
import IndexerWebhookController from './controllers/indexerWebhook.controller'
import { RevalidatePageService } from '../../App/revalidatePage/revalidatePage.service'
import IPFSGetterService from '../IPFSGetter/ipfs-getter.service'
import GraphProviderService from '../Provider/graph.service'
import MetadataChangesService from '../Store/metadataChanges.service'
import DBStoreService from '../Store/store.service'
import IPFSValidatorService from '../Validator/validator.service'
import RunCommand from '../run.command'
import IndexerWebhookService from './services/indexerWebhook.service'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'
import AutoInjestService from '../../App/utils/auto-injest'
import { LockingService } from '../../App/IQHolders/IQHolders.dto'
import RPCProviderService from '../RPCProvider/RPCProvider.service'

@Module({
  imports: [httpModule(10000), CacheModule.register({ ttl: 3600 })],
  controllers: [IndexerWebhookController],
  providers: [
    IndexerWebhookService,
    GraphProviderService,
    DBStoreService,
    IPFSValidatorService,
    MetadataChangesService,
    IPFSGetterService,
    RevalidatePageService,
    RunCommand,
    AlchemyNotifyService,
    AutoInjestService,
    LockingService,
    RPCProviderService
  ],
})
class IndexerWebhookModule {}

export default IndexerWebhookModule
