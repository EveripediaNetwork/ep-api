import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import Treasury from '../../Database/Entities/treasury.entity';
import TreasuryRepository from './treasury.repository';
import TreasuryResolver from './treasury.resolver';
import TreasuryService from './treasury.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Treasury]),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  providers: [TreasuryResolver, TreasuryService, TreasuryRepository],
  exports: [TreasuryResolver, TreasuryService, TreasuryRepository],
})
export default class TreasuryModule {}
