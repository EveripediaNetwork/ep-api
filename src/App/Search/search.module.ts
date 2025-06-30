import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import SearchController from './search.controller'
import SearchService from './search.service'
import SearchResolver from './search.resolver'

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [SearchController],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export default class SearchModule {}
