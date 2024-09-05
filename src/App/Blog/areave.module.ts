import { Module } from '@nestjs/common'
import { ArweaveService } from './arweave.service'

@Module({
    providers: [ArweaveService],
    exports: [ArweaveService],
  })
export class ArweaveModule {}
