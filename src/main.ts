/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import rateLimit from 'express-rate-limit'
import { NestExpressApplication } from '@nestjs/platform-express'

import winston from 'winston'
import ecsFormat from '@elastic/ecs-winston-format'
import axios from 'axios'
import AppModule from './App/app.module'
import apCall from './wr.js'

async function bootstrap() {
  let app = await NestFactory.create<NestExpressApplication>(AppModule)

  const configService = app.get(ConfigService)

  const port = configService.get<number>('PORT')

  const logger = winston.createLogger({
    level: 'debug',
    format: ecsFormat({ convertReqRes: true }),
    transports: [
      new winston.transports.File({
        filename: 'logs/log.json',
        level: 'debug',
      }),
    ],
  })

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
    integrations: [new Tracing.Integrations.Apollo()],
  })
  app.set('trust proxy', 1)

  app.use(
    Sentry.Handlers.tracingHandler(),
    rateLimit({
      windowMs: configService.get<number>('THROTTLE_TTL'),
      max: configService.get<number>('THROTTLE_LIMIT'),
      message: async (request: any, response: any) =>
        response.json({ message: 'You are being rate limited' }),
    }),
  )

  await app.listen(port || 5000, () => {
    logger.debug('listening at http://localhost:7000/api')
  })
  try {
    const response: any = await axios.post('http://localhost:7000/api', {
      headers: {
        from: 'pangolin@the.zoo',
      },
    })
    // logger.info(response.request)
    // console.log(response.request)
  } catch (error: any) {
    console.log(error.response.body)
  }
}

bootstrap()
