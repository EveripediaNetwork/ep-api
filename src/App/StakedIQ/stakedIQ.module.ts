import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import StakedIQ from '../../Database/Entities/stakedIQ.entity'
import StakedIQRepository from './stakedIQ.repository'
import StakedIQResolver from './stakedIQ.resolver'
import StakedIQService from './stakedIQ.service'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'
import BlockchainProviderService from '../utils/BlockchainProviderService'

@Module({
  imports: [TypeOrmModule.forFeature([StakedIQ]), HttpModule],
  providers: [
    BlockchainProviderService,
    StakedIQResolver,
    StakedIQService,
    StakedIQRepository,
    AlchemyNotifyService,
  ],
  exports: [StakedIQResolver, StakedIQService, StakedIQRepository],
})
export default class StakedIQModule {}
