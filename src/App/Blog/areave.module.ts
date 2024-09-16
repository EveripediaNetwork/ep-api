import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import ArweaveService from './arweave.service'

@Module({
  imports: [ConfigModule],
    providers: [ArweaveService],
    exports: [ArweaveService],
  })
export default class ArweaveModule {}
