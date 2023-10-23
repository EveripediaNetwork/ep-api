import { Injectable, NestMiddleware } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import * as Tracing from '@sentry/tracing'
import { ConfigService } from '@nestjs/config'

const ignoredEndpoints = ['/brainpass/nft-events', '/indexer']

@Injectable()
export default class SentryMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    Sentry.init({
      dsn: this.configService.get<string>('SENTRY_DSN'),
      tracesSampleRate: 0.3,
      integrations: [new Tracing.Integrations.Apollo()],
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
