import { ConfigModule, ConfigService } from '@nestjs/config'
import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'

import WikiResolver from './wiki.resolver'
import LanguageResolver from './language.resolver'
import CategoryResolver from './category.resolver'
import TagResolver from './tag.resolver'
import UserResolver from './user.resolver'

import DatabaseModule from '../Database/database.module'

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
    DatabaseModule,
  ],
  controllers: [],
  providers: [
    ConfigService,
    WikiResolver,
    LanguageResolver,
    CategoryResolver,
    TagResolver,
    UserResolver,
  ],
})
class AppModule {}

export default AppModule
