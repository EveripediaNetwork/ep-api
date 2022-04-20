import { Module } from '@nestjs/common'

import RelayerService from './services/relayer.service'
import RelayerController from './controllers/relayer.controller'
import RelayerResolver from './resolvers/relayer.resolver'
import httpModule from '../httpModule'

@Module({
  imports: [httpModule(10000)],
  controllers: [RelayerController],
  providers: [RelayerService, RelayerResolver],
})
class RelayerModule {}

export default RelayerModule
