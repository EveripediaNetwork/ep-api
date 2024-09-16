import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import MirrorApiService from './mirrorApi.service'

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [MirrorApiService],
  exports: [MirrorApiService],
})
export default class MirrorApiModule {}
