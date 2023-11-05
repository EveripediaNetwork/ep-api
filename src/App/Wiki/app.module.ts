import { CacheModule, Module } from '@nestjs/common'

@Module({
  imports: [
    CacheModule.register(),
  ],
})
export default class AppModule {}
