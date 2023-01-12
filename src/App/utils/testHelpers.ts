import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { RevalidatePageService } from '../revalidatePage/revalidatePage.service'
import WikiResolver from '../wiki.resolver'
import WikiService from '../wiki.service'
import WebhookHandler from './discordWebhookHandler'
import TokenValidator from './validateToken'
import { ValidSlug } from './validSlug'

export const mockCacheStore = {
  get: jest.fn(),
  set: jest.fn(),
}

export const providerArray = [
  ValidSlug,
  WikiResolver,
  WikiService,
  RevalidatePageService,
  EventEmitter2,
  ConfigService,
  TokenValidator,
  WebhookHandler,
]
