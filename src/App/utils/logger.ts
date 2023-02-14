/* eslint-disable import/no-extraneous-dependencies */
import ecsFormat from '@elastic/ecs-winston-format'
import { NextFunction } from 'express'
import fs from 'fs'
import winston from 'winston'

export const winstonLog = () =>
  winston.createLogger({
    format: ecsFormat({ convertReqRes: true, convertErr: true }),
    transports: [
      new winston.transports.File({
        filename: 'logs/log.json',
        level: 'info',
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: 'logs/log.json',
        level: 'error',
      }),
    ],
  })

winstonLog()

const logger = (req: any, res: any, next: NextFunction) => {
  const logFile = `${process.cwd()}/logs/log.json`

  if (!fs.existsSync(logFile)) winstonLog()

  if (req?.body?.operationName !== 'IntrospectionQuery') {
    const { body } = req
    winstonLog().info(`${process.env.NODE_ENV} requests`, {
      req,
      res,
      body,
    })
  }
  next()
}

export default logger
