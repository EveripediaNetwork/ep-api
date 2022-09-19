import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule, MiddlewareConsumer, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'

import { GraphQLDirective, DirectiveLocation } from 'graphql'
import WikiResolver from './wiki.resolver'
import LanguageResolver from './language.resolver'
import CategoryResolver from './category.resolver'
import TagResolver from './tag.resolver'
import UserResolver from './user.resolver'
import ActivityResolver from './activity.resolver'

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
import PageViewsResolver from './pageViews.resolver'
import PageViewsService from './pageViews.service'
import { RevalidatePageService } from './utils/revalidatePage/revalidatePage.service'
import httpModule from '../httpModule'
import RevalidatePageResolver from './utils/revalidatePage/revalidatePage.resolver'

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
      context: ({ req }) => ({ req }),
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
    httpModule(20000),
    PinModule,
    DatabaseModule,
    RelayerModule,
    TokenStatsModule,
  ],
  controllers: [],
  providers: [
    ConfigService,
    WikiResolver,
    LanguageResolver,
    CategoryResolver,
    TagResolver,
    UserResolver,
    UserService,
    ActivityResolver,
    UserProfileResolver,
    StatsResolver,
    ValidSlug,
    PageViewsResolver,
    PageViewsService,
    RevalidatePageService,
    RevalidatePageResolver,
  ],
})
class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PinMiddleware).forRoutes('graphql')
  }
}

export default AppModule
