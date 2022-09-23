import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
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

  app =
    Number(port) === 443
      ? await NestFactory.create<NestFastifyApplication>(
          AppModule,
          new FastifyAdapter(),
          {
            httpsOptions: {
              cert: fs.readFileSync('../fullchain.pem'),
              key: fs.readFileSync('../privkey.pem'),
            },
          },
        )
      : await NestFactory.create<NestFastifyApplication>(
          AppModule,
          new FastifyAdapter(),
        )

  app.enableCors()
  app.useGlobalPipes(new ValidationPipe())
  Sentry.init({
    dsn: configService.get<string>('SENTRY_DSN'),
  })
  await app.listen(port || 5000, '0.0.0.0')
}

bootstrap()
