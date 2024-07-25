import { CacheModule, Module } from '@nestjs/common'
import httpModule from '../../httpModule'
import TokenStatsResolver from './tokenStats.resolver'
import TokenStatsService from './tokenStats.service'
import StatsGetterService from './stats-getter.service'

@Module({
  imports: [httpModule(20000), CacheModule.register({ ttl: 30 })],
  providers: [TokenStatsResolver, TokenStatsService, StatsGetterService],
})
export default class TokenStatsModule {}
