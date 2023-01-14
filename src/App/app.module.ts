import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule, MiddlewareConsumer, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { GraphQLDirective, DirectiveLocation } from 'graphql'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { SentryModule } from '@ntegral/nestjs-sentry'
import PinModule from './pinJSONAndImage/pin.module'
import PinMiddleware from './pinJSONAndImage/pin.middleware'
import DatabaseModule from '../Database/database.module'
import RelayerModule from '../Relayer/relayer.module'
import TokenStatsModule from './tokenStats/tokenStats.module'
import userDirectiveTransformer from './utils/userDirectiveTransformer'
import httpModule from '../httpModule'
import SitemapModule from '../Sitemap/sitemap.module'

import { getProviders, ProviderEnum } from './utils/testHelpers'

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
    ...getProviders([
      ProviderEnum.adminLogsInterceptor,
      ProviderEnum.configService,
      ProviderEnum.wikiResolver,
      ProviderEnum.wikiService,
      ProviderEnum.languageResolver,
      ProviderEnum.categoryResolver,
      ProviderEnum.categoryService,
      ProviderEnum.tagResolver,
      ProviderEnum.userResolver,
      ProviderEnum.userService,
      ProviderEnum.activityResolver,
      ProviderEnum.userProfileResolver,
      ProviderEnum.statsResolver,
      ProviderEnum.validSlug,
      ProviderEnum.pageViewsResolver,
      ProviderEnum.pageViewsService,
      ProviderEnum.revalidatePageService,
      ProviderEnum.revalidatePageResolver,
      ProviderEnum.flagWikiService,
      ProviderEnum.flagWikiResolver,
      ProviderEnum.webhookHandler,
      ProviderEnum.tokenValidator,
      ProviderEnum.wikiSubscriptionResolver,
      ProviderEnum.wikiSubscriptionService,
      ProviderEnum.marketCapResolver,
      ProviderEnum.marketCapService,
      ProviderEnum.sentryPlugin,
    ], 'App'),
  ],
})
class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PinMiddleware).forRoutes('graphql')
  }
}

export default AppModule
