import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Draft } from '../../Database/Entities/draft.entity'
import { DraftService } from './draft.service'
import { DraftResolver } from './draft.resolver'

@Module({
  imports: [TypeOrmModule.forFeature([Draft])],
  providers: [DraftService, DraftResolver],
  exports: [DraftService],
})
export class DraftModule {}
