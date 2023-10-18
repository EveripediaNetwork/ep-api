import { Test, TestingModule } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { DataSource } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { CACHE_MANAGER } from '@nestjs/common'
import { RevalidatePageService, Routes } from './revalidatePage.service'

describe('RevalidatePage Service', () => {
  let revalidatePageService: RevalidatePageService
  let dataSource: {
    createEntityManager: jest.Mock
  }
  const configService = {
    get: jest.fn(),
  }
  const httpService = {
    get: jest.fn(() => ({
      toPromise: jest.fn(),
    })),
  }
  const cacheManager = {
    del: jest.fn(),
    get: jest.fn(),
  }
  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevalidatePageService,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile()
    revalidatePageService = module.get<RevalidatePageService>(
      RevalidatePageService,
    )
  })
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should be defined', () => {
    expect(revalidatePageService).toBeDefined()
  })
  it('should revalidate a page', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'REVALIDATE_SECRET') {
        return 'mock-secret-key'
      }
      if (key === 'WEBSITE_URL') {
        return 'https://mock-website-url.com'
      }
      return undefined
    })
    const httpServiceGetMock = jest.fn(() => ({
      toPromise: jest.fn(),
    }))
    httpService.get.mockReturnValue(httpServiceGetMock)

    await revalidatePageService.revalidate(Routes.HOMEPAGE)
    const expectedUrl =
      'https://mock-website-url.com/api/revalidate?secret=mock-secret-key&path=/'
    expect(httpService.get).toHaveBeenCalledWith(expectedUrl)
    expect(httpService.get().toPromise).toHaveBeenCalled()
  })
})
