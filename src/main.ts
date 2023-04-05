/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import rateLimit from 'express-rate-limit'
import { NestExpressApplication } from '@nestjs/platform-express'

import AppModule from './App/app.module'

async function bootstrap() {
  let app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
  })

  const configService = app.get(ConfigService)

  const port = configService.get<number>('PORT')

  app =
    Number(port) === 443
      ? await NestFactory.create(AppModule, {
          httpsOptions: {
            cert: fs.readFileSync('../fullchain.pem'),
            key: fs.readFileSync('../privkey.pem'),
          },
        })
      : await NestFactory.create(AppModule)

  app.enableCors()
  app.useGlobalPipes(new ValidationPipe())
  Sentry.init({
    dsn: configService.get<string>('SENTRY_DSN'),
    tracesSampleRate: 0.3,
    beforeSend: (e) => {
      if (e.exception?.values && e.exception.values[0].type === 'RangeError') {
        console.error(e)
      }
      return e
    },

    integrations: [new Tracing.Integrations.Apollo()],
  })
  app.set('trust proxy', 1)

  app.use(
    Sentry.Handlers.tracingHandler(),
    rateLimit({
      windowMs: configService.get<number>('THROTTLE_TTL'),
      max: configService.get<number>('THROTTLE_LIMIT'),
      message: async (_request: any, response: any) =>
        response.json({ message: 'You are being rate limited' }),
    }),
  )

  await app.listen(port || 5000)
}

bootstrap()
