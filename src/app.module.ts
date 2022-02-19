import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { SequelizeModule } from '@nestjs/sequelize'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import IpfsHashModule from './ipfs-hash/ipfs-hash.module'
import AppController from './app.controller'
import AppService from './app.service'
import Hash from './ipfs-hash/models/hashIndex.model'

import config from './database/config.json'

@Module({
  imports: [
    IpfsHashModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: config.development.host,
      port: 5432,
      username: config.development.username,
      password: config.development.password,
      database: config.development.database,
      models: [Hash],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

export default AppModule
