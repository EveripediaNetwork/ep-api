import { CacheModule, Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule';
import WikiService from './wiki.service';

@Module({
  providers:[WikiService],
  imports: [
    CacheModule.register(),
    ScheduleModule.forRoot()
  ],
})
export default class AppModule {}
