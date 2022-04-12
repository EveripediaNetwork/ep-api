import { ConfigModule, ConfigService } from '@nestjs/config'
import { MiddlewareConsumer, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'

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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      debug: true,
      playground: true,
      cors: true,
      autoSchemaFile: true,
    }),
    PinModule,
    DatabaseModule,
    RelayerModule,
    TokenStatsModule
  ],
  controllers: [],
  providers: [
    ConfigService,
    WikiResolver,
    LanguageResolver,
    CategoryResolver,
    TagResolver,
    UserResolver,
    ActivityResolver,
  ],
})
class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PinMiddleware).forRoutes('graphql')
  }
}

export default AppModule
