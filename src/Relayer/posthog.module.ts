import { Module } from '@nestjs/common'
import { PosthogModule } from 'nestjs-posthog'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
   imports: [
    PosthogModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const apiKey = configService.get<string>('POSTHOG_API_KEY')
          const host = configService.get<string>('POSTHOG_API_URL')
          if (!apiKey ||!host) {
            console.error('Posthog configuration is missing apiKey or host')
          } else {
          console.log(`Posthog configuration: apiKey=${apiKey}, host=${host}`);
        }
          return {
            apiKey: apiKey || '',
            options: {
              host,
            },
            mock: false,
          }
        },
      }),
   ],
   exports: [PosthogModule]
})


export class PosthogConfigModule {}