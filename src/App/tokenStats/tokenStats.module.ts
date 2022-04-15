import { HttpModule } from '@nestjs/axios'
import { CacheModule, Module } from '@nestjs/common'
import TokenStatsResolver from './tokenStats.resolver'
import TokenStatsService from './tokenStats.service'
import StatsGetterController from './CryptoStats/stats-getter.controller'
import StatsGetterService from './CryptoStats/stats-getter.service'

@Module({
  imports: [
    HttpModule.register({
      timeout: 20000,
      maxRedirects: 5,
    }),
    CacheModule.register({ ttl: 30 }),
  ],
  controllers: [StatsGetterController],
  providers: [TokenStatsResolver, TokenStatsService, StatsGetterService],
})
export default class TokenStatsModule {}
