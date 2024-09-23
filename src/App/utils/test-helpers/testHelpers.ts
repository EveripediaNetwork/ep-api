import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PosthogService } from 'nestjs-posthog'
import { LockingService } from '../../IQHolders/IQHolders.dto'
import SentryPlugin from '../../../sentry/sentryPlugin'
import ActivityResolver from '../../Activities/activity.resolver'
import ActivityService from '../../Activities/activity.service'
import CategoryResolver from '../../Category/category.resolver'
import ContentFeedbackResolver from '../../content-feedback/contentFeedback.resolver'
import ContentFeedbackService from '../../content-feedback/contentFeedback.service'
import FlagWikiResolver from '../../flaggingSystem/flagWiki.resolver'
import FlagWikiService from '../../flaggingSystem/flagWiki.service'
import LanguageResolver from '../../Language/language.resolver'
import MarketCapResolver from '../../marketCap/marketCap.resolver'
import MarketCapService from '../../marketCap/marketCap.service'
import PageViewsResolver from '../../pageViews/pageViews.resolver'
import PageViewsService from '../../pageViews/pageViews.service'
import RevalidatePageResolver from '../../revalidatePage/revalidatePage.resolver'
import { RevalidatePageService } from '../../revalidatePage/revalidatePage.service'
import WikiSubscriptionResolver from '../../Subscriptions/subscriptions.resolver'
import TagResolver from '../../Tag/tag.resolver'
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
import WikiSubscriptionService from '../../Subscriptions/subscriptions.service'
import CategoryService from '../../Category/category.service'
import TagService from '../../Tag/tag.service'
import AutoInjestService from '../auto-injest'
import DiscordWebhookService from '../discordWebhookService'
import TagRepository from '../../Tag/tag.repository'
import RPCProviderService from '../../../Indexer/RPCProvider/RPCProvider.service'
import AppService from '../../app.service'

export const providerObjects = {
  validSlug: ValidSlug,
  runCommand: RunCommand,
  tagService: TagService,
  appService: AppService,
  tagResolver: TagResolver,
  wikiService: WikiService,
  userService: UserService,
  userResolver: UserResolver,
  sentryPlugin: SentryPlugin,
  wikiResolver: WikiResolver,
  eventEmitter2: EventEmitter2,
  configService: ConfigService,
  tagRepository: TagRepository,
  tokenValidator: TokenValidator,
  postHogService: PosthogService,
  dbStoreService: DBStoreService,
  webhookHandler: WebhookHandler,
  lockingService: LockingService,
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
  autoInjestService: AutoInjestService,
  rpcProviderService: RPCProviderService,
  userProfileResolver: UserProfileResolver,
  ipfsValidatorService: IPFSValidatorService,
  graphProviderService: GraphProviderService,
  adminLogsInterceptor: AdminLogsInterceptor,
  discordWebhookService: DiscordWebhookService,
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
  tagService = 'tagService',
  appService = 'appService',
  tagResolver = 'tagResolver',
  wikiService = 'wikiService',
  userService = 'userService',
  userResolver = 'userResolver',
  sentryPlugin = 'sentryPlugin',
  wikiResolver = 'wikiResolver',
  eventEmitter2 = 'eventEmitter2',
  configService = 'configService',
  postHogService = 'postHogService',
  tokenValidator = 'tokenValidator',
  tagRepository = 'tagRepository',
  dbStoreService = 'dbStoreService',
  webhookHandler = 'webhookHandler',
  lockingService = 'lockingService',
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
  autoInjestService = 'autoInjestService',
  rpcProviderService = 'rpcProviderService',
  userProfileResolver = 'userProfileResolver',
  ipfsValidatorService = 'ipfsValidatorService',
  graphProviderService = 'graphProviderService',
  adminLogsInterceptor = 'adminLogsInterceptor',
  discordWebhookService = 'discordWebhookService',
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
