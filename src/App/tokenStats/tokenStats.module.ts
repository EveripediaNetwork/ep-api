import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import httpModule from '../../httpModule'
import TokenStatsResolver from './tokenStats.resolver'
import TokenStatsService from './tokenStats.service'
import StatsGetterService from './stats-getter.service'
import CacheTTL from '../../config/cache.config'

@Module({
  imports: [
    httpModule(20000),
    CacheModule.register({ ttl: CacheTTL.THIRTY_SECONDS }),
  ],
  providers: [TokenStatsResolver, TokenStatsService, StatsGetterService],
})
export default class TokenStatsModule {}
