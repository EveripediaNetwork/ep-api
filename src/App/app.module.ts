import { MiddlewareConsumer, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import DatabaseModule from '../Database/database.module'
import LanguageResolver from './language.resolver'
import CategoryResolver from './category.resolver'
import TagResolver from './tag.resolver'
import UserResolver from './user.resolver'
import WikiResolver from './wiki.resolver'
import PinModule from './pinJSONAndImage/pin.module'
import PinMiddleware from './pinJSONAndImage/pin.middleware'

@Module({
  imports: [
    DatabaseModule,
    PinModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      debug: true,
      playground: true,
      autoSchemaFile: true,
    }),
  ],
  controllers: [],
  providers: [
    WikiResolver,
    LanguageResolver,
    CategoryResolver,
    TagResolver,
    UserResolver,
  ],
})
class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PinMiddleware).forRoutes('graphql')
  }
}

export default AppModule
