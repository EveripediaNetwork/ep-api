import { MiddlewareConsumer, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import DatabaseModule from '../Database/database.module'
import WikiResolver from './wiki.resolver'
import LanguageResolver from './language.resolver'
import CategoryResolver from './category.resolver'
import TagResolver from './tag.resolver'
import UserResolver from './user.resolver'
import WikiService from './wiki.service'
import WikiMiddleware from './wiki.middleware'

@Module({
  imports: [
    DatabaseModule,
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
    WikiService,
    LanguageResolver,
    CategoryResolver,
    TagResolver,
    UserResolver,
  ],
})
class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WikiMiddleware).forRoutes('graphql')
  }
}

export default AppModule
