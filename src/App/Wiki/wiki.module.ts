import { CacheModule, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiResolver from './wiki.resolver'
import WikiService from './wiki.service'
import { ValidSlug } from '../utils/validSlug'
import { RevalidatePageService } from '../revalidatePage/revalidatePage.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import httpModule from '../../httpModule'
import TokenValidator from '../utils/validateToken'

@Module({
  imports: [
    TypeOrmModule.forFeature([Wiki]),
    CacheModule.register({ ttl: 3600 }),
    httpModule(20000),
    EventEmitterModule.forRoot({ verboseMemoryLeak: false }),
  ],
  providers: [
    ConfigService,
    WikiResolver,
    WikiService,
    ValidSlug,
    TokenValidator,
    WebhookHandler,
    RevalidatePageService,
  ],
  exports: [WikiResolver, WikiService],
})
export default class WikiModule {}
