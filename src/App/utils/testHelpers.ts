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

export const providerArray = {
  validSlug: ValidSlug,
  wikiResolver: WikiResolver,
  wikiService: WikiService,
  eventEmitter2: EventEmitter2,
  configService: ConfigService,
  tokenValidator: TokenValidator,
  webhookHandler: WebhookHandler,
  revalidatePageService: RevalidatePageService,
}


export enum ProviderEnum {
  validSlug = 'validSlug',
  wikiResolver = 'wikiResolver',
  wikiService = 'wikiService',
  eventEmitter2 = 'eventEmitter2',
  configService = 'configService',
  tokenValidator = 'tokenValidator',
  webhookHandler = 'webhookHandler',
  revalidatePageService = 'revalidatePageService',
}

export const getProviders = (providers: ProviderEnum[]) => {
  const filteredValues = Object.entries(providerArray)
    .filter(([key]) => Object.values(providers).includes(key as ProviderEnum))
    .map(([, value]) => value)
  return filteredValues
}

