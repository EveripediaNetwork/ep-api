/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-extraneous-dependencies */
import ecsFormat from '@elastic/ecs-winston-format'
import { NextFunction } from 'express'
import fs from 'fs'
import winston from 'winston'

const winstonLog = () =>
  winston.createLogger({
    level: 'info',
    format: ecsFormat({ convertReqRes: true }),
    transports: [
      new winston.transports.File({
        filename: 'logs/log.json',
        level: 'info',
      }),
    ],
  })

winstonLog()

const logger = (req: any, res: any, next: NextFunction) => {
  const logFile = `${process.cwd()}/logs/log.json`

  if (!fs.existsSync(logFile)) winstonLog()

  if (req?.body?.operationName !== 'IntrospectionQuery') {
    const { body } = req
    winstonLog().info(`${process.env.NODE_ENV} requests`, { req, res, body })
  }
  next()
}

export default logger
