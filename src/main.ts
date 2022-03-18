import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import AppModule from './App/app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  let app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  const port = configService.get<number>('PORT')

  app =
    port === 443
      ? await NestFactory.create(AppModule, {
          httpsOptions: {
            cert: fs.readFileSync('../fullchain.pem'),
            key: fs.readFileSync('../privkey.pem'),
          },
        })
      : await NestFactory.create(AppModule)

  app.enableCors()
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(port || 5000)
}

bootstrap()
