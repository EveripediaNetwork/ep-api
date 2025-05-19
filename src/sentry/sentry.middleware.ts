import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import * as Sentry from '@sentry/node'
import { ENDPOINTS_CONFIG } from '../config/endpoints.config'

@Injectable()
export default class SentryMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (
      ENDPOINTS_CONFIG.IGNORED.includes(
        req.path as (typeof ENDPOINTS_CONFIG.IGNORED)[number],
      )
    ) {
      return next()
    }

    process.setMaxListeners(0)
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    })

    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${req.method} ${req.path}`,
    })

    Sentry.configureScope((scope) => {
      scope.setSpan(transaction)
    })

    res.on('finish', () => {
      transaction.setHttpStatus(res.statusCode)
      transaction.finish()
    })

    return next()
  }
}
