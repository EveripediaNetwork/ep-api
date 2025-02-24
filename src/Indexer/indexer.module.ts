import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { PosthogModule, PosthogService } from 'nestjs-posthog'
import { SentryGlobalFilter } from '@sentry/nestjs/setup'
import RunCommand from './run.command'
import GraphProviderService from './Provider/graph.service'
import HistoryProviderService from './Provider/history.service'
import DBStoreService from './Store/store.service'
import IPFSValidatorService from './Validator/validator.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import DatabaseModule from '../Database/database.module'
import httpModule from '../httpModule'
import MetadataChangesService from './Store/metadataChanges.service'
import { RevalidatePageService } from '../App/revalidatePage/revalidatePage.service'
import SentryMod from '../sentry/sentry.module'
import AutoInjestService from '../App/utils/auto-injest'
import { LockingService } from '../App/IQHolders/IQHolders.dto'
import RPCProviderService from './RPCProvider/RPCProvider.service'
import AppService from '../App/app.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    httpModule(20000),
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
    SentryMod,
  ],
  controllers: [],
  providers: [
    AppService,
    PosthogService,
    GraphProviderService,
    HistoryProviderService,
    DBStoreService,
    IPFSValidatorService,
    MetadataChangesService,
    IPFSGetterService,
    RunCommand,
    RevalidatePageService,
    AutoInjestService,
    LockingService,
    RPCProviderService,
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryGlobalFilter,
    },
  ],
})
class IndexerModule {}

export default IndexerModule
