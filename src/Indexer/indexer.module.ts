import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import RunCommand from './run.command'
import GraphProviderService from './Provider/graph.service'
import HistoryProviderService from './Provider/history.service'
import DBStoreService from './Store/store.service'
import IPFSValidatorService from './Validator/validator.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import DatabaseModule from '../Database/database.module'
import httpModule from '../httpModule'
import MetadataChangesService from './Store/metadataChanges.service'
import { RevalidatePageService } from '../App/utils/revalidatePage.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    httpModule(20000),
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
  ],
})
class IndexerModule {}

export default IndexerModule
