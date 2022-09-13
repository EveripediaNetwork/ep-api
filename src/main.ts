import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import AppModule from './App/app.module'

async function bootstrap() {
  let app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )
  const configService = app.get(ConfigService)

  const port = configService.get<number>('PORT')

  const CORS_OPTIONS = {
    origin: true,
    allowedHeaders: [
      'Access-Control-Allow-Origin',
      'Origin',
      'X-Requested-With',
      'Accept',
      'Content-Type',
      'Authorization',
    ],
    exposedHeaders: 'Authorization',
    methods: ['GET', 'PUT', 'OPTIONS', 'POST', 'DELETE'],
  }

  const adapter = (opts?: { cert: Buffer; key: Buffer }) => {
    if (opts) {
      const socket = new FastifyAdapter({ https: opts })
      socket.enableCors(CORS_OPTIONS)
      return socket
    }
    const socket = new FastifyAdapter()
    socket.enableCors(CORS_OPTIONS)
    return socket
  }

  if (Number(port) === 443) {
    const httpsOptions = {
      cert: fs.readFileSync('../fullchain.pem'),
      key: fs.readFileSync('../privkey.pem'),
    }
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      adapter(httpsOptions),
    )
  } else {
    app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter())
  }

  app.useGlobalPipes(new ValidationPipe())
  Sentry.init({
    dsn: configService.get<string>('SENTRY_DSN'),
  })
  await app.listen(port || 5000)
}

bootstrap()
