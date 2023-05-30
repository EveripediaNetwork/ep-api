import { CacheModule, Module } from '@nestjs/common'
import httpModule from '../../httpModule'
import IndexerWebhookController from './controllers/indexerWebhook.controller'
import { RevalidatePageService } from '../../App/revalidatePage/revalidatePage.service'
import IPFSGetterService from '../IPFSGetter/ipfs-getter.service'
import GraphProviderService from '../Provider/graph.service'
import MetadataChangesService from '../Store/metadataChanges.service'
import DBStoreService from '../Store/store.service'
import IPFSValidatorService from '../Validator/validator.service'

@Module({
  imports: [httpModule(10000), CacheModule.register({ ttl: 3600 })],
  controllers: [IndexerWebhookController],
  providers: [
    GraphProviderService,
    DBStoreService,
    IPFSValidatorService,
    MetadataChangesService,
    IPFSGetterService,
    RevalidatePageService,
  ],
})
class IndexerWebhookModule {}

export default IndexerWebhookModule
