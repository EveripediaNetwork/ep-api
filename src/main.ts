import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import AppModule from './App/app.module'

async function bootstrap() {
  let app = await NestFactory.create(AppModule)
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
    dsn: 'https://3062851b00b7492c97cbe48ee24ab487@o1291176.ingest.sentry.io/6512854',
  })
  await app.listen(port || 5000)
}

bootstrap()
