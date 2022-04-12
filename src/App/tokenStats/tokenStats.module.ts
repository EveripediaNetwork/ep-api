import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import TokenStatsResolver from './tokenStats.resolver'
import TokenStatsService from './tokenStats.service'

@Module({
  imports: [
    HttpModule.register({
      timeout: 20000,
      maxRedirects: 5,
    }),
  ],
  providers: [TokenStatsResolver, TokenStatsService],
})
export default class TokenStatsModule {}
