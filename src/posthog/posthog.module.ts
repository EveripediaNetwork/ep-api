import { Module } from '@nestjs/common'
import { PosthogModule } from 'nestjs-posthog'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [
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
    }),
  ],
})
export default class PostHogManager {}
