import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'

import RelayerService from './services/relayer.service'
import RelayerController from './controllers/relayer.controller'

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [RelayerController],
  providers: [RelayerService],
})
class RelayerModule {}

export default RelayerModule
