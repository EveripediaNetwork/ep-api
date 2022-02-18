import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import * as dotenv from 'dotenv'
import IpfsHashModule from './ipfs-hash/ipfs-hash.module'
import AppController from './app.controller'
import AppService from './app.service'
import Hash from './ipfs-hash/models/hashIndex.model'

dotenv.config()

@Module({
  imports: [
    IpfsHashModule,
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.HOST,
      port: 5432,
      username: process.env.USER,
      password: process.env.PASSWORD,
      database: process.env.NAME,
      models: [Hash],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

export default AppModule
