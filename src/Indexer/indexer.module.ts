import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import RunCommand from './run.command'
import GraphProviderService from './Provider/graph.service'
import HistoryProviderService from './Provider/history.service'
import DBStoreService from './Store/store.service'
import IPFSValidatorService from './Validator/validator.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import DatabaseModule from '../Database/database.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HttpModule.register({
      timeout: 20000,
      maxRedirects: 5,
    }),
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
