import { CacheModule, Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import DiscordWebhookService from './discordWebhookService'
import WebhookHandler from './discordWebhookHandler'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import httpModule from '../../httpModule'

@Module({
  imports: [
    TypeOrmModule.forFeature([Wiki, UserProfile]),
    CacheModule.register({ ttl: 3600 }),
    httpModule(10000),
    ScheduleModule.forRoot(),
  ],
  providers: [WebhookHandler, DiscordWebhookService],
  exports: [WebhookHandler, DiscordWebhookService],
})
class DiscordModule {}

export default DiscordModule
