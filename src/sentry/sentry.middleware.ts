import { Injectable, NestMiddleware } from '@nestjs/common'
import Sentry from '@sentry/nestjs'
import { NextFunction, Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'

const ignoredEndpoints = ['/brainpass/nft-events', '/indexer']

@Injectable()
export default class SentryMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    Sentry.init({
      dsn: this.configService.get<string>('SENTRY_DSN'),
      tracesSampleRate: 0.2,
      profilesSampleRate: 0.2,
      integrations: [Sentry.graphqlIntegration()],
      ignoreErrors: ['RangeError'],
    })

    process.setMaxListeners(0)

    process.on('uncaughtException', (error) => {
      Sentry.captureException(error)
    })

    if (ignoredEndpoints.includes(req.originalUrl)) {
      return next()
    }
    ;(req as any).sentry = Sentry

    return next()
  }
}
