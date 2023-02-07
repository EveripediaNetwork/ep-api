/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-extraneous-dependencies */
import ecsFormat from '@elastic/ecs-winston-format'
import { NextFunction } from 'express'
import winston from 'winston'

const winstonLog = winston.createLogger({
  level: 'debug',
  format: ecsFormat({ convertReqRes: true }),
  transports: [
    new winston.transports.File({
      filename: 'logs/log.json',
      level: 'debug',
    }),
  ],
})

const logger = (req: any, res: any, next: NextFunction) => {
  if (req?.body?.operationName !== 'IntrospectionQuery') {
    const { body } = req
    winstonLog.info(`${process.env.NODE_ENV} requests`, { req, res, body })
  }
  next()
}

export default logger
