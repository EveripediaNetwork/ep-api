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
    IPFSGetterService,
    RunCommand,
  ],
})
class IndexerModule {}

export default IndexerModule
