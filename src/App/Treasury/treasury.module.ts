import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import Treasury from '../../Database/Entities/treasury.entity'
import TreasuryRepository from './treasury.repository'
import TreasuryResolver from './treasury.resolver'
import TreasuryService from './treasury.service'

@Module({
  imports: [TypeOrmModule.forFeature([Treasury]), HttpModule],
  providers: [TreasuryResolver, TreasuryService, TreasuryRepository],
  exports: [TreasuryResolver, TreasuryService, TreasuryRepository],
})
export default class TreasuryModule {}
