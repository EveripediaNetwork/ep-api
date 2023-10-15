import { CacheModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { SentryInterceptor } from '@ntegral/nestjs-sentry'
import { EventEmitterModule } from '@nestjs/event-emitter'
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    httpModule(20000),
    CacheModule.register({ ttl: 3600 }),
    SentryMod,
    EventEmitterModule.forRoot({ verboseMemoryLeak: false }),
  ],
  controllers: [],
  providers: [
    GraphProviderService,
    HistoryProviderService,
    DBStoreService,
    IPFSValidatorService,
    MetadataChangesService,
    IPFSGetterService,
    RunCommand,
    RevalidatePageService,
    AutoInjestService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new SentryInterceptor(),
    },
  ],
})
class IndexerModule {}

export default IndexerModule
