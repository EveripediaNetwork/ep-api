import { Module } from '@nestjs/common'
import { PosthogModule, PosthogService } from 'nestjs-posthog'
import { ConfigModule, ConfigService } from '@nestjs/config'
import RelayerService from './services/relayer.service'
import RelayerController from './controllers/relayer.controller'
import RelayerResolver from './resolvers/relayer.resolver'
import httpModule from '../httpModule'
import ActivityModule from '../App/Activities/activity.module'
import AppService from '../App/app.service'

@Module({
  imports: [httpModule(10000), ActivityModule, 
    PosthogModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get<string>('POSTHOG_API_KEY') as string,
        options: {
          host: config.get<string>('POSTHOG_API_URL') as string,
        },
        mock: false,
      }),
    }),],
  controllers: [RelayerController],
  providers: [RelayerService, RelayerResolver, AppService, PosthogService],
})
class RelayerModule {}

export default RelayerModule
