import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { TypeOrmModule } from '@nestjs/typeorm'
import DiscordWebhookService from './discordWebhookService'
import WebhookHandler from './discordWebhookHandler'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import httpModule from '../../httpModule'
import CacheTTL from '../../config/cache.config'

@Module({
  imports: [
    TypeOrmModule.forFeature([Wiki, UserProfile]),
    CacheModule.register({ ttl: CacheTTL.ONE_HOUR }),
    httpModule(10000),
  ],
  providers: [WebhookHandler, DiscordWebhookService],
  exports: [WebhookHandler, DiscordWebhookService],
})
class DiscordModule {}

export default DiscordModule
