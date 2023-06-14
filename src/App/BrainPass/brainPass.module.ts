import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import BrainPassResolver from './brainPass.resolver'
import BrainPassController from './brainPass.controller'
import BrainPassRepository from './brainPass.repository'

@Module({
  imports: [HttpModule],
  controllers: [BrainPassController],
  providers: [BrainPassResolver, BrainPassController, BrainPassRepository],
  exports: [BrainPassResolver, BrainPassController, BrainPassRepository],
})
export default class BrainPassModule {}
