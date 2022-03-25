import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'

import RelayerService from './services/relayer.service'
import RelayerController from './controllers/relayer.controller'
import RelayerResolver from './resolvers/relayer.resolver'

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [RelayerController],
  providers: [RelayerService, RelayerResolver],
})
class RelayerModule {}

export default RelayerModule
