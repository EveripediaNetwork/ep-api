import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import BrainPassResolver from './brainPass.resolver'
import BrainPassController from './brainPass.controller'
import BrainPassRepository from './brainPass.repository'
import BrainPassService from './brainPass.service'
import PinataService from '../../ExternalServices/pinata.service'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'

@Module({
  imports: [HttpModule],
  controllers: [BrainPassController],
  providers: [
    BrainPassResolver,
    BrainPassController,
    BrainPassRepository,
    BrainPassService,
    PinataService,
    AlchemyNotifyService,
  ],
  exports: [BrainPassResolver, BrainPassController, BrainPassRepository],
})
export default class BrainPassModule {}
