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
        beforeSend: event => {
          if (
            event.exception &&
            event.exception?.values &&
            event.exception.values[0].type === 'RangeError'
          ) {
            console.log(event)
          }
          return event
        },
        tracesSampleRate: 0.3,
      }),
      inject: [ConfigService],
    }),
  ],
})
class SentryMod {}

export default SentryMod
