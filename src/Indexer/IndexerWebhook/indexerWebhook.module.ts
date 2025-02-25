import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { PosthogModule, PosthogService } from 'nestjs-posthog'
import { ConfigModule, ConfigService } from '@nestjs/config'
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
import AppService from '../../App/app.service'

@Module({
  imports: [
    httpModule(10000),
    CacheModule.register({ ttl: 3600 * 1000 }),
    PosthogModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get<string>('POSTHOG_API_KEY') as string,
        options: {
          host: config.get<string>('POSTHOG_API_URL') as string,
        },
        mock: false,
      }),
    }),
  ],
  controllers: [IndexerWebhookController],
  providers: [
    PosthogService,
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
    RPCProviderService,
    AppService,
  ],
})
class IndexerWebhookModule {}

export default IndexerWebhookModule
