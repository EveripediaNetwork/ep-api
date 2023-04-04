import { HttpModule } from '@nestjs/axios'
import { Test, TestingModule } from '@nestjs/testing'
import { CacheModule } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { getMockRes } from '@jest-mock/express'
import ContentFeedbackService from './contentFeedback.service'
import ContentFeedbackResolver from './contentFeedback.resolver'
import { getProviders, ProviderEnum } from '../utils/testHelpers'
import { ContentFeedbackArgs } from './contentFeedback.dto'

jest.mock('fs')

const mockCacheStore = {
  get: jest.fn(),
  set: jest.fn(),
}

const ctx = {
  req: {
    ip: 'localhost',
  },
}

const thumbsUp = {
  wikId: 'right-of-way',
  userId: '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
  choice: true,
} as unknown as ContentFeedbackArgs

describe('ContentFeedbackResolver', () => {
  let resolver: ContentFeedbackResolver
  let service: ContentFeedbackService
  let moduleRef: TestingModule

  const result: any = getMockRes({
    data: {
      wikiViewCount: 1,
    },
  })

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.register({
          ttl: 3600,
          store: mockCacheStore,
        }),
      ],
      providers: [
        ...getProviders([
          ProviderEnum.configService,
          ProviderEnum.webhookHandler,
          ProviderEnum.contentFeedbackService,
          ProviderEnum.contentFeedbackResolver,
        ]),
        {
          provide: DataSource,
          useFactory: () => ({
            updateCount: jest.fn(() => result),
          }),
        },
      ],
    }).compile()
    resolver = moduleRef.get<ContentFeedbackResolver>(ContentFeedbackResolver)
    service = moduleRef.get<ContentFeedbackService>(ContentFeedbackService)
  })

  it('should be defined', () => {
    expect(resolver).toBeDefined()
  })

  it('should return true if content feedback is created or updated', async () => {
    jest.spyOn(service, 'postWikiFeedback').mockResolvedValue(true)
    expect(await resolver.contentFeedback(ctx, thumbsUp)).toBe(true)
    expect(
      await resolver.contentFeedback(ctx, { ...thumbsUp, choice: false }),
    ).toBe(true)
  })

  it('should return false if content feedback is duplicated or cached', async () => {
    jest.spyOn(service, 'postWikiFeedback').mockResolvedValue(false)
    expect(await resolver.contentFeedback(ctx, thumbsUp)).toBe(false)
  })
})
