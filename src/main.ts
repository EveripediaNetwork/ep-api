/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import rateLimit from 'express-rate-limit'
import { NestExpressApplication } from '@nestjs/platform-express'
import { urlencoded, json } from 'express'
import { EventEmitter2 } from '@nestjs/event-emitter'
import AppModule from './App/app.module'
import Pm2Service from './App/utils/pm2Service'

const pm2 = require('pm2')

async function bootstrapApplication() {
  let app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
  })

  const configService = app.get(ConfigService)
  const cacheManager = app.get<Cache>('CACHE_MANAGER')
  const eventEmitter = app.get(EventEmitter2)
  const pm2Service = app.get(Pm2Service)

  // Call your methods

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
  app.set('trust proxy', 1)

  app.use(json({ limit: '10mb' }))
  app.use(urlencoded({ extended: true, limit: '10mb' }))

  app.use(
    rateLimit({
      windowMs: configService.get<number>('THROTTLE_TTL'),
      max: configService.get<number>('THROTTLE_LIMIT'),
      message: async (_request: any, response: any) =>
        response.json({ message: 'You are being rate limited' }),
    }),
  )

  process.on('message', async (packet: any) => {
    if (packet.topic === 'updateCache') {
      await cacheManager.set(packet.data.key, packet.data.data, {
        ttl: packet.data.ttl || 300,
      })
    }
    if (packet.topic === 'deleteCache') {
      for (const key of packet.data.keys) {
        await cacheManager.del(key)
      }
    }

    if (packet.topic === 'buildSearchData') {
      const key = 'marketCapSearch'
      const cacheData = await cacheManager.get(key)
      if (!cacheData) {
        eventEmitter.emit('buildSearchData', {
          id: Number(process.env.pm_id),
        })
      } else {
        pm2Service.sendDataToProcesses(
          'ep-api',
          'updateCache [marketCapSearch]',
          { data: cacheData, key },
          Number(process.env.pm_id),
        )
      }
    }
  })

  process.on('SIGTERM', () => {
    if (
      process.env.pm_id &&
      Number(process.env.pm_id) !== 0 &&
      process.env.name === 'ep-api'
    ) {
      pm2.connect((err: unknown) => {
        if (err) {
          console.error('Error connecting to PM2:', err)
          return
        }

        pm2.sendDataToProcessId(
          {
            id: 0,
            topic: 'buildSearchData',
          },
          () => {
            if (err) {
              console.error('Error sending data to process root process', err)
            } else {
              console.log(
                `buildSearchData initiated for ${Number(process.env.pm_id)}`,
              )
            }
          },
        )
      })
    }
    process.exit(0)
  })

  await app.listen(port || 5000)
}

if (require.main === module) {
  // istanbul ignore next
  bootstrapApplication()
}

export default bootstrapApplication
