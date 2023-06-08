import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import Activity from '../../Database/Entities/activity.entity'
import ActivityRepository from './activity.repository'
import ActivityResolver from './activity.resolver'
import ActivityService from './activity.service'

@Module({
  imports: [TypeOrmModule.forFeature([Activity])],
  providers: [ActivityResolver, ActivityService, ActivityRepository],
  exports: [ActivityRepository, ActivityService],
})
export default class ActivityModule {}
