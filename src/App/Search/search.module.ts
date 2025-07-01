import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import SearchService from './search.service'
import SearchResolver from './search.resolver'

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export default class SearchModule {}
