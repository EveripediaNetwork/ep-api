import { Module } from '@nestjs/common'

import RelayerService from './services/relayer.service'
import RelayerController from './controllers/relayer.controller'
import RelayerResolver from './resolvers/relayer.resolver'
import httpModule from '../httpModule'
import ActivityService from '../App/Activities/activity.service'

@Module({
  imports: [httpModule(10000)],
  controllers: [RelayerController],
  providers: [RelayerService, RelayerResolver, ActivityService],
})
class RelayerModule {}

export default RelayerModule
