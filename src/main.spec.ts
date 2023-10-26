/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-shadow */
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import fs from 'fs'
import { NestExpressApplication } from '@nestjs/platform-express'
import AppModule from './App/app.module'
import bootstrapApplication from './main'

jest.mock('@nestjs/core')
jest.mock('@nestjs/config')
jest.mock('fs')
jest.mock('@sentry/node')
jest.mock('express-rate-limit')

describe('bootstrap', () => {
  let mockApp: NestExpressApplication
  let mockConfigService: ConfigService

  beforeEach(() => {
    mockApp = {
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      set: jest.fn(),
      use: jest.fn(),
      listen: jest.fn(),
      get: jest.fn().mockReturnValue(5000),
    } as unknown as NestExpressApplication

    NestFactory.create = jest.fn().mockResolvedValue(mockApp)
    fs.readFileSync = jest.fn().mockReturnValue('certificate content')

    mockConfigService = {
      get: jest.fn().mockReturnValue(5000),
    } as unknown as ConfigService

    jest.spyOn(mockApp, 'get').mockReturnValue(mockConfigService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create the app with the correct options', async () => {
    await bootstrapApplication()

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule, {
      abortOnError: false,
    })
  })

  it('should enable CORS', async () => {
    await bootstrapApplication()

    expect(mockApp.enableCors).toHaveBeenCalled()
  })

  it('should use global validation pipe', async () => {
    await bootstrapApplication()

    expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
      expect.objectContaining({
        exceptionFactory: expect.any(Function),
        validatorOptions: expect.objectContaining({
          forbidUnknownValues: false,
        }),
      }),
    )
  })

  it('should trust proxy', async () => {
    await bootstrapApplication()

    expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 1)
  })

  it('should listen on the specified port', async () => {
    await bootstrapApplication()

    expect(mockApp.listen).toHaveBeenCalledWith(5000)
  })
})
