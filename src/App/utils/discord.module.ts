import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { TypeOrmModule } from '@nestjs/typeorm'
import DiscordWebhookService from './discordWebhookService'
import WebhookHandler from './discordWebhookHandler'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import httpModule from '../../httpModule'

@Module({
  imports: [
    TypeOrmModule.forFeature([Wiki, UserProfile]),
    CacheModule.register({ ttl: 3600 * 1000 }),
    httpModule(10000),
  ],
  providers: [WebhookHandler, DiscordWebhookService],
  exports: [WebhookHandler, DiscordWebhookService],
})
class DiscordModule {}

export default DiscordModule
