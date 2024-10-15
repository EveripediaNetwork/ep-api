/* eslint-disable import/no-extraneous-dependencies */
import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  BadRequestException,
  CacheModule,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { GraphQLDirective, DirectiveLocation } from 'graphql'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { GraphqlInterceptor } from '@ntegral/nestjs-sentry'
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache'
import { APP_INTERCEPTOR } from '@nestjs/core'
import WikiResolver from './Wiki/wiki.resolver'
import LanguageResolver from './Language/language.resolver'
import CategoryResolver from './Category/category.resolver'
import TagResolver from './Tag/tag.resolver'
import UserResolver from './User/user.resolver'
import PinMiddleware from './pinJSONAndImage/pin.middleware'
import DatabaseModule from '../Database/database.module'
import RelayerModule from '../Relayer/relayer.module'
import TokenStatsModule from './tokenStats/tokenStats.module'
import UserProfileResolver from './User/userProfile.resolver'
import UserService from './User/user.service'
import userDirectiveTransformer from './utils/userDirectiveTransformer'
import { ValidSlug } from './utils/validSlug'
import PageViewsResolver from './pageViews/pageViews.resolver'
import PageViewsService from './pageViews/pageViews.service'
import { RevalidatePageService } from './revalidatePage/revalidatePage.service'
import httpModule from '../httpModule'
import RevalidatePageResolver from './revalidatePage/revalidatePage.resolver'
import FlagWikiService from './flaggingSystem/flagWiki.service'
import FlagWikiResolver from './flaggingSystem/flagWiki.resolver'
import AdminLogsInterceptor from './utils/adminLogs.interceptor'
import WikiSubscriptionResolver from './Subscriptions/subscriptions.resolver'
import TokenValidator from './utils/validateToken'
import SentryPlugin from '../sentry/sentryPlugin'
import MarketCapResolver from './marketCap/marketCap.resolver'
import MarketCapService from './marketCap/marketCap.service'
import SitemapModule from '../Sitemap/sitemap.module'
import WikiService from './Wiki/wiki.service'
import logger from './utils/logger'
import ContentFeedbackService from './content-feedback/contentFeedback.service'
import ContentFeedbackResolver from './content-feedback/contentFeedback.resolver'
import SecurityTestingService from './utils/securityTester'
import IndexerWebhookModule from '../Indexer/IndexerWebhook/indexerWebhook.module'
import WikiSubscriptionService from './Subscriptions/subscriptions.service'
import CategoryService from './Category/category.service'
import TagService from './Tag/tag.service'
import PinModule from './pinJSONAndImage/pin.module'
import BrainPassModule from './BrainPass/brainPass.module'
import ActivityModule from './Activities/activity.module'
import TreasuryModule from './Treasury/treasury.module'
import StakedIQModule from './StakedIQ/stakedIQ.module'
import HiIQHolderModule from './HiIQHolders/hiIQHolder.module'
import IQHolderModule from './IQHolders/IQHolder.module'
import SentryMiddleware from '../sentry/sentry.middleware'
import SentryMod from '../sentry/sentry.module'
import DiscordModule from './utils/discord.module'
import UploadController from './Upload/upload.controller'
import EventsResolver from './Wiki/events.resolver'
import TagRepository from './Tag/tag.repository'
import EventsService from './Wiki/events.service'
import AppService from './app.service'
import WikiController from './Wiki/controllers/wiki.controller'
import BlogService from './Blog/blog.service'
import BlogModule from './Blog/blog.module'
import MarketCapSearch from './marketCap/marketCapSearch.service'

// istanbul ignore next
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.register({ ttl: 3600, max: 10000, isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      installSubscriptionHandlers: true,
      debug: true,
      playground: true,
      introspection: process.env.NODE_ENV !== 'production',
      cors: true,
      cache: new InMemoryLRUCache(),
      autoSchemaFile: true,
      context: ({ req, connection }) => ({ req, connection }),
      transformSchema: schema => userDirectiveTransformer(schema, 'isUser'),
      buildSchemaOptions: {
        directives: [
          new GraphQLDirective({
            name: 'isUser',
            locations: [DirectiveLocation.FIELD_DEFINITION],
          }),
        ],
      },
    }),
    SitemapModule,
    MailerModule,
    httpModule(20000),
    EventEmitterModule.forRoot({ verboseMemoryLeak: false }),
    PinModule,
    DatabaseModule,
    RelayerModule,
    TokenStatsModule,
    BrainPassModule,
    ActivityModule,
    IndexerWebhookModule,
    TreasuryModule,
    StakedIQModule,
    HiIQHolderModule,
    IQHolderModule,
    DiscordModule,
    BlogModule,
    SentryMod,
  ],
  controllers: [UploadController, WikiController],
  providers: [
    AppService,
    SecurityTestingService,
    ConfigService,
    WikiResolver,
    WikiService,
    LanguageResolver,
    CategoryResolver,
    CategoryService,
    TagRepository,
    TagResolver,
    TagService,
    UserResolver,
    UserService,
    UserProfileResolver,
    ValidSlug,
    PageViewsResolver,
    PageViewsService,
    RevalidatePageService,
    RevalidatePageResolver,
    FlagWikiService,
    FlagWikiResolver,
    ContentFeedbackService,
    ContentFeedbackResolver,
    AdminLogsInterceptor,
    TokenValidator,
    WikiSubscriptionResolver,
    WikiSubscriptionService,
    MarketCapResolver,
    MarketCapService,
    MarketCapSearch,
    SentryPlugin,
    BlogService,
    EventsResolver,
    EventsService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        new GraphqlInterceptor({
          filters: [
            {
              type: BadRequestException,
              filter: (e: BadRequestException) =>
                e.message !== 'Invalid parameters',
            },
          ],
        }),
    },
  ],
})
class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SentryMiddleware).exclude('graphql').forRoutes('*')
    consumer.apply(PinMiddleware, logger).forRoutes('graphql')
  }
}

export default AppModule
