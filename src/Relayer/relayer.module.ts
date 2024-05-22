import { Module } from '@nestjs/common'

import RelayerService from './services/relayer.service'
import RelayerController from './controllers/relayer.controller'
import RelayerResolver from './resolvers/relayer.resolver'
import httpModule from '../httpModule'
import ActivityModule from '../App/Activities/activity.module'
import AppService from '../App/app.service'

@Module({
  imports: [httpModule(10000), ActivityModule],
  controllers: [RelayerController],
  providers: [RelayerService, RelayerResolver, AppService],
})
class RelayerModule {}

export default RelayerModule
