import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { SequelizeModule } from '@nestjs/sequelize'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import * as dotenv from 'dotenv'
import IpfsHashModule from './ipfs-hash/ipfs-hash.module'
import AppController from './app.controller'
import AppService from './app.service'
import Hash from './ipfs-hash/models/hashIndex.model'

dotenv.config()

@Module({
  imports: [
    IpfsHashModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: `${process.env.DB_NAME}-${process.env.NODE_ENV}`,
      models: [Hash],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

export default AppModule
