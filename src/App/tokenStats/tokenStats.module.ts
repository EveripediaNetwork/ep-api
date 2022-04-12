import { HttpModule } from '@nestjs/axios'
import { CacheModule, Module } from '@nestjs/common'
import TokenStatsResolver from './tokenStats.resolver'
import TokenStatsService from './tokenStats.service'

@Module({
  imports: [
    HttpModule.register({
      timeout: 20000,
      maxRedirects: 5,
    }),
    CacheModule.register({ ttl: 30 }),
  ],
  providers: [TokenStatsResolver, TokenStatsService],
})
export default class TokenStatsModule {}
