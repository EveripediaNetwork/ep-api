import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import AppModule from './App/app.module'
import config from './config'

async function bootstrap() {
  const app =
    Number(config.port) === 443
      ? await NestFactory.create(AppModule, {
          httpsOptions: {
            cert: fs.readFileSync('../fullchain.pem'),
            key: fs.readFileSync('../privkey.pem'),
          },
        })
      : await NestFactory.create(AppModule)
  app.enableCors()
  await app.listen(config.port)
}

bootstrap()
