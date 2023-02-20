/* eslint-disable import/no-extraneous-dependencies */
import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule, MiddlewareConsumer, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { GraphQLDirective, DirectiveLocation } from 'graphql'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { SentryModule } from '@ntegral/nestjs-sentry'
import WikiResolver from './wiki.resolver'
import LanguageResolver from './language.resolver'
import CategoryResolver from './category.resolver'
import TagResolver from './tag.resolver'
import UserResolver from './user.resolver'

import PinModule from './pinJSONAndImage/pin.module'
import PinMiddleware from './pinJSONAndImage/pin.middleware'

import DatabaseModule from '../Database/database.module'
import RelayerModule from '../Relayer/relayer.module'
import TokenStatsModule from './tokenStats/tokenStats.module'
import UserProfileResolver from './userProfile.resolver'
import UserService from './user.service'
import StatsResolver from './stats.resolver'
import userDirectiveTransformer from './utils/userDirectiveTransformer'
import { ValidSlug } from './utils/validSlug'
import PageViewsResolver from './pageViews/pageViews.resolver'
import PageViewsService from './pageViews/pageViews.service'
import { RevalidatePageService } from './revalidatePage/revalidatePage.service'
import httpModule from '../httpModule'
import RevalidatePageResolver from './revalidatePage/revalidatePage.resolver'
import FlagWikiService from './flaggingSystem/flagWiki.service'
import FlagWikiResolver from './flaggingSystem/flagWiki.resolver'
import WebhookHandler from './utils/discordWebhookHandler'
import AdminLogsInterceptor from './utils/adminLogs.interceptor'
import WikiSubscriptionResolver from './subscriptions.resolver'
import WikiSubscriptionService from './subscriptions.service'
import TokenValidator from './utils/validateToken'
import SentryPlugin from '../sentry/sentryPlugin'
import MarketCapResolver from './marketCap/marketCap.resolver'
import MarketCapService from './marketCap/marketCap.service'
import SitemapModule from '../Sitemap/sitemap.module'
import WikiService from './wiki.service'
import CategoryService from './category.service'
import logger from './utils/logger'
import ActivityResolver from './Activities/activity.resolver'
import ActivityService from './Activities/activity.service'
import ContentFeedbackService from './content-feedback/contentFeedback.service'
import ContentFeedbackResolver from './content-feedback/contentFeedback.resolver'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.register({ ttl: 3600 }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      debug: true,
      playground: true,
      cors: true,
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
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (cfg: ConfigService) => ({
        dsn: cfg.get('SENTRY_DSN'),
        debug: true,
        environment: 'dev' || 'production',
        logLevels: ['debug'],
      }),
      inject: [ConfigService],
    }),
    MailerModule,
    httpModule(20000),
    EventEmitterModule.forRoot(),
    PinModule,
    DatabaseModule,
    RelayerModule,
    TokenStatsModule,
  ],
  controllers: [],
  providers: [
    ConfigService,
    WikiResolver,
    WikiService,
    LanguageResolver,
    CategoryResolver,
    CategoryService,
    TagResolver,
    UserResolver,
    UserService,
    ActivityResolver,
    ActivityService,
    UserProfileResolver,
    StatsResolver,
    ValidSlug,
    PageViewsResolver,
    PageViewsService,
    RevalidatePageService,
    RevalidatePageResolver,
    FlagWikiService,
    FlagWikiResolver,
    ContentFeedbackService,
    ContentFeedbackResolver,
    WebhookHandler,
    AdminLogsInterceptor,
    TokenValidator,
    WikiSubscriptionResolver,
    WikiSubscriptionService,
    MarketCapResolver,
    MarketCapService,
    SentryPlugin,
  ],
})
class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PinMiddleware, logger).forRoutes('graphql')
  }
}

export default AppModule
