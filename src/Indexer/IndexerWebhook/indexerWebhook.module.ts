import { Module } from '@nestjs/common'
import httpModule from '../../httpModule'
import IndexerWebhookController from './controllers/indexerWebhook.controller'

@Module({
  imports: [httpModule(10000)],
  controllers: [IndexerWebhookController],
  providers: [],
})
class IndexerWebhookModule {}

export default IndexerWebhookModule
