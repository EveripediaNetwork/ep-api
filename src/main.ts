import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import AppModule from './App/app.module'

async function bootstrap() {
  let app = await NestFactory.create(AppModule)
  const configService = app.use(ConfigService)

  const port = configService.get('PORT')

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
  await app.listen(port)
}

bootstrap()
