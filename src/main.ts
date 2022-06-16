import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import AppModule from './App/app.module'
import * as Sentry from '@sentry/node';

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
    dsn: 'https://4e98de50242247eebc5512b55bc558a3@sentry.io/1837145',
  });
  await app.listen(port || 5000)
}

bootstrap()
