import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SentryModule } from '@ntegral/nestjs-sentry'

@Module({
  imports: [
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (cfg: ConfigService) => ({
        dsn: cfg.get('SENTRY_DSN'),
        debug: true,
        environment: cfg.get('NODE_ENV'),
        logLevels: ['debug'],
        tracesSampleRate: 0.2,
        profilesSampleRate: 0.2,
        ignoreErrors: ['RangeError'],
      }),
      inject: [ConfigService],
    }),
  ],
})
class SentryMod {}

export default SentryMod
