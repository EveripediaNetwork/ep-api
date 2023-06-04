/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-shadow */
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import fs from 'fs'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import { NestExpressApplication } from '@nestjs/platform-express'
import rateLimit from 'express-rate-limit'
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
      get: jest.fn().mockReturnValue('dummy-value'),
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

  it('should initialize Sentry with the correct options', async () => {
    await bootstrapApplication()

    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: 'dummy-value',
      tracesSampleRate: 0.3,
      integrations: [expect.any(Tracing.Integrations.Apollo)],
    })
  })

  it('should trust proxy', async () => {
    await bootstrapApplication()

    expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 1)
  })

  it('should use Sentry tracing handler and rate limit middleware', async () => {
    const mockTracingHandler = jest.fn()
    Sentry.Handlers.tracingHandler = mockTracingHandler

    const mockResponse = {
      json: jest
        .fn()
        .mockResolvedValue({ message: 'You are being rate limited' }),
    }


    // Mock the rateLimit middleware
    // const mockRateLimit = jest.fn()  ({
    //   windowMs: mockConfigService.get<number>('THROTTLE_TTL'),
    //   max: mockConfigService.get<number>('THROTTLE_LIMIT'),
    //   message: jest.fn().mockImplementation(async (_request, response, ) => {
    //     // Call the mocked async response.json() function
    //     await response.json(mockResponse.json())

    //   }),
    // })

    // const mockRateLimit = jest.fn().mockImplementation(jest.fn())
    // jest.mock('express-rate-limit', () => jest.fn(() => mockRateLimit))

    await bootstrapApplication()

    expect(mockTracingHandler).toHaveBeenCalled()
    expect(rateLimit).toHaveBeenCalledWith({
      windowMs: mockConfigService.get<number>('THROTTLE_TTL'),
      max: mockConfigService.get<number>('THROTTLE_LIMIT'),
      message: jest.fn().mockImplementation(async (_request, response) => {
        // Call the mocked async response.json() function
        response.json(mockResponse.json())
      }),
    })
  })

  it('should listen on the specified port', async () => {
    await bootstrapApplication()

    expect(mockApp.listen).toHaveBeenCalledWith('dummy-value')
  })
})
