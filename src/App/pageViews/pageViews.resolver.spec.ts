import { Test, TestingModule } from '@nestjs/testing'
import { CacheModule } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { getMockRes } from '@jest-mock/express'
import PageViewsService from './pageViews.service'
import PageViewsResolver from './pageViews.resolver'

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

describe('PageViewsResolver', () => {
  let resolver: PageViewsResolver
  let service: PageViewsService
  let moduleRef: TestingModule

  const result: any = getMockRes({
    data: {
      wikiViewCount: 1,
    },
  })

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CacheModule.register({
          ttl: 3600,
          store: mockCacheStore,
        }),
      ],
      providers: [
        PageViewsResolver,
        PageViewsService,
        {
          provide: DataSource,
          useFactory: () => ({
            updateCount: jest.fn(() => result),
          }),
        },
      ],
    }).compile()
    resolver = moduleRef.get<PageViewsResolver>(PageViewsResolver)
    service = moduleRef.get<PageViewsService>(PageViewsService)
  })

  it('should be defined', () => {
    expect(resolver).toBeDefined()
  })

  it('should return 1 if wiki view count is updated', async () => {
    jest.spyOn(service, 'updateCount').mockResolvedValue(1)
    expect(await resolver.wikiViewCount('right-of-way', ctx)).toBe(1)
  })

  it('should return 0 if wiki view count is updated in the last hour by same ip', async () => {
    jest.spyOn(service, 'updateCount').mockResolvedValue(0)
    expect(await resolver.wikiViewCount('right-of-way', ctx)).toBe(0)
  })
})
