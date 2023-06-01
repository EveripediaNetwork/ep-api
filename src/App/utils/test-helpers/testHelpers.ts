import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import SentryPlugin from '../../../sentry/sentryPlugin'
import ActivityResolver from '../../Activities/activity.resolver'
import ActivityService from '../../Activities/activity.service'
import CategoryResolver from '../../category.resolver'
import CategoryService from '../../category.service'
import ContentFeedbackResolver from '../../content-feedback/contentFeedback.resolver'
import ContentFeedbackService from '../../content-feedback/contentFeedback.service'
import FlagWikiResolver from '../../flaggingSystem/flagWiki.resolver'
import FlagWikiService from '../../flaggingSystem/flagWiki.service'
import LanguageResolver from '../../language.resolver'
import MarketCapResolver from '../../marketCap/marketCap.resolver'
import MarketCapService from '../../marketCap/marketCap.service'
import PageViewsResolver from '../../pageViews/pageViews.resolver'
import PageViewsService from '../../pageViews/pageViews.service'
import RevalidatePageResolver from '../../revalidatePage/revalidatePage.resolver'
import { RevalidatePageService } from '../../revalidatePage/revalidatePage.service'
import StatsResolver from '../../WikiStats/wikiStats.resolver'
import WikiSubscriptionResolver from '../../subscriptions.resolver'
import WikiSubscriptionService from '../../subscriptions.service'
import TagResolver from '../../tag.resolver'
import UserResolver from '../../User/user.resolver'
import UserService from '../../User/user.service'
import UserProfileResolver from '../../User/userProfile.resolver'
import WikiResolver from '../../Wiki/wiki.resolver'
import WikiService from '../../Wiki/wiki.service'
import AdminLogsInterceptor from '../adminLogs.interceptor'
import WebhookHandler from '../discordWebhookHandler'
import TokenValidator from '../validateToken'
import { ValidSlug } from '../validSlug'
import RunCommand from '../../../Indexer/run.command'
import IPFSGetterService from '../../../Indexer/IPFSGetter/ipfs-getter.service'
import IndexerWebhookService from '../../../Indexer/IndexerWebhook/services/indexerWebhook.service'
import GraphProviderService from '../../../Indexer/Provider/graph.service'
import MetadataChangesService from '../../../Indexer/Store/metadataChanges.service'
import DBStoreService from '../../../Indexer/Store/store.service'
import IPFSValidatorService from '../../../Indexer/Validator/validator.service'

export const providerObjects = {
  validSlug: ValidSlug,
  runCommand: RunCommand,
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
  dbStoreService: DBStoreService,
  webhookHandler: WebhookHandler,
  activityService: ActivityService,
  categoryService: CategoryService,
  flagWikiService: FlagWikiService,
  flagWikiResolver: FlagWikiResolver,
  categoryResolver: CategoryResolver,
  pageViewsService: PageViewsService,
  languageResolver: LanguageResolver,
  activityResolver: ActivityResolver,
  marketCapService: MarketCapService,
  pageViewsResolver: PageViewsResolver,
  ipfsGetterService: IPFSGetterService,
  marketCapResolver: MarketCapResolver,
  userProfileResolver: UserProfileResolver,
  ipfsValidatorService: IPFSValidatorService,
  graphProviderService: GraphProviderService,
  adminLogsInterceptor: AdminLogsInterceptor,
  indexerWebhookService: IndexerWebhookService,
  revalidatePageService: RevalidatePageService,
  revalidatePageResolver: RevalidatePageResolver,
  metadataChangesService: MetadataChangesService,
  contentFeedbackService: ContentFeedbackService,
  contentFeedbackResolver: ContentFeedbackResolver,
  wikiSubscriptionService: WikiSubscriptionService,
  wikiSubscriptionResolver: WikiSubscriptionResolver,
}

export enum ProviderEnum {
  validSlug = 'validSlug',
  runCommand = 'runCommand',
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
  dbStoreService = 'dbStoreService',
  webhookHandler = 'webhookHandler',
  activityService = 'activityService',
  categoryService = 'categoryService',
  flagWikiService = 'flagWikiService',
  flagWikiResolver = 'flagWikiResolver',
  categoryResolver = 'categoryResolver',
  pageViewsService = 'pageViewsService',
  languageResolver = 'languageResolver',
  activityResolver = 'activityResolver',
  marketCapService = 'marketCapService',
  pageViewsResolver = 'pageViewsResolver',
  ipfsGetterService = 'ipfsGetterService',
  marketCapResolver = 'marketCapResolver',
  userProfileResolver = 'userProfileResolver',
  ipfsValidatorService = 'ipfsValidatorService',
  graphProviderService = 'graphProviderService',
  adminLogsInterceptor = 'adminLogsInterceptor',
  indexerWebhookService = 'indexerWebhookService',
  revalidatePageService = 'revalidatePageService',
  revalidatePageResolver = 'evalidatePageResolver',
  metadataChangesService = 'metadataChangesService',
  contentFeedbackService = 'contentFeedbackService',
  contentFeedbackResolver = 'contentFeedbackResolver',
  wikiSubscriptionService = 'wikiSubscriptionService',
  wikiSubscriptionResolver = 'wikiSubscriptionResolver',
}

export const getProviders = (providers: ProviderEnum[]) => {
  const filteredValues = Object.entries(providerObjects)
    .filter(([key]) => Object.values(providers).includes(key as ProviderEnum))
    .map(([, value]) => value)
  return filteredValues
}
