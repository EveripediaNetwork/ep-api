import { NestFactory } from '@nestjs/core'
import AppModule from './App/app.module'
import config from './config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  await app.listen(config.port)
}

bootstrap()
