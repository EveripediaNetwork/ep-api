import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import SentryPlugin from '../../sentry/sentryPlugin'
import ActivityResolver from '../activity.resolver'
import CategoryResolver from '../category.resolver'
import CategoryService from '../category.service'
import FlagWikiResolver from '../flaggingSystem/flagWiki.resolver'
import FlagWikiService from '../flaggingSystem/flagWiki.service'
import LanguageResolver from '../language.resolver'
import MarketCapResolver from '../marketCap/marketCap.resolver'
import MarketCapService from '../marketCap/marketCap.service'
import PageViewsResolver from '../pageViews/pageViews.resolver'
import PageViewsService from '../pageViews/pageViews.service'
import RevalidatePageResolver from '../revalidatePage/revalidatePage.resolver'
import { RevalidatePageService } from '../revalidatePage/revalidatePage.service'
import StatsResolver from '../stats.resolver'
import WikiSubscriptionResolver from '../subscriptions.resolver'
import WikiSubscriptionService from '../subscriptions.service'
import TagResolver from '../tag.resolver'
import UserResolver from '../user.resolver'
import UserService from '../user.service'
import UserProfileResolver from '../userProfile.resolver'
import WikiResolver from '../wiki.resolver'
import WikiService from '../wiki.service'
import AdminLogsInterceptor from './adminLogs.interceptor'
import WebhookHandler from './discordWebhookHandler'
import TokenValidator from './validateToken'
import { ValidSlug } from './validSlug'

export const providerObjects = {
  validSlug: ValidSlug,
  tagResolver: TagResolver,
  wikiService: WikiService,
  userService: UserService,
  userResolver: UserResolver,
  sentryPlugin: SentryPlugin,
  wikiResolver: WikiResolver,
  eventEmitter2: EventEmitter2,
  statsResolver: StatsResolver,
  configService: ConfigService,
  tokenValidator: TokenValidator,
  webhookHandler: WebhookHandler,
  categoryService: CategoryService,
  flagWikiService: FlagWikiService,
  flagWikiResolver: FlagWikiResolver,
  categoryResolver: CategoryResolver,
  pageViewsService: PageViewsService,
  languageResolver: LanguageResolver,
  activityResolver: ActivityResolver,
  marketCapService: MarketCapService,
  pageViewsResolver: PageViewsResolver,
  marketCapResolver: MarketCapResolver,
  userProfileResolver: UserProfileResolver,
  adminLogsInterceptor: AdminLogsInterceptor,
  revalidatePageService: RevalidatePageService,
  revalidatePageResolver: RevalidatePageResolver,
  wikiSubscriptionService: WikiSubscriptionService,
  wikiSubscriptionResolver: WikiSubscriptionResolver,
}

export enum ProviderEnum {
  validSlug = 'validSlug',
  tagResolver = 'tagResolver',
  wikiService = 'wikiService',
  userService = 'userService',
  userResolver = 'userResolver',
  sentryPlugin = 'sentryPlugin',
  wikiResolver = 'wikiResolver',
  eventEmitter2 = 'eventEmitter2',
  statsResolver = 'statsResolver',
  configService = 'configService',
  tokenValidator = 'tokenValidator',
  webhookHandler = 'webhookHandler',
  categoryService = 'categoryService',
  flagWikiService = 'flagWikiService',
  flagWikiResolver = 'flagWikiResolver',
  categoryResolver = 'categoryResolver',
  pageViewsService = 'pageViewsService',
  languageResolver = 'languageResolver',
  activityResolver = 'activityResolver',
  marketCapService = 'marketCapService',
  pageViewsResolver = 'pageViewsResolver',
  marketCapResolver = 'marketCapResolver',
  userProfileResolver = 'userProfileResolver',
  adminLogsInterceptor = 'adminLogsInterceptor',
  revalidatePageService = 'revalidatePageService',
  revalidatePageResolver = 'evalidatePageResolver',
  wikiSubscriptionService = 'wikiSubscriptionService',
  wikiSubscriptionResolver = 'wikiSubscriptionResolver',
}

export const getProviders = (providers: ProviderEnum[]) => {
  const filteredValues = Object.entries(providerObjects)
    .filter(([key]) => Object.values(providers).includes(key as ProviderEnum))
    .map(([, value]) => value)
  return filteredValues
}
