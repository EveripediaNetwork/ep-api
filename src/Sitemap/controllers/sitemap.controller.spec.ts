import { HttpModule } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { TestingModule, Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { CacheModule } from '@nestjs/cache-manager'
import { mockCacheStore } from '../../App/utils/test-helpers/reuseableTestObjects'
import SitemapController from './sitemap.controller'
import WikiService from '../../App/Wiki/wiki.service'
import { ValidSlug } from '../../App/utils/validSlug'
import CategoryService from '../../App/Category/category.service'
import WikiTranslationService from '../../App/Translation/translation.service'

// Mock the dependencies
jest.mock('../../App/Wiki/wiki.service')
jest.mock('../../App/Category/category.service')
jest.mock('@nestjs/config')
// jest.mock('sitemap')

describe('SitemapController', () => {
  let controller: SitemapController
  let moduleRef: TestingModule
  let mockResponse: any

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [SitemapController],
      imports: [
        HttpModule,
        CacheModule.register({
          ttl: 3600 * 1000,
          store: mockCacheStore,
        }),
      ],
      providers: [
        ValidSlug,
        {
          provide: WikiService,
          useFactory: () => ({
            getWikiIds: jest.fn(() => []),
          }),
        },
        {
          provide: CategoryService,
          useFactory: () => ({
            getCategoryIds: jest.fn(() => []),
          }),
        },
        {
          provide: WikiTranslationService,
          useFactory: () => ({
            getTranslationWikiIds: jest.fn(() => []),
          }),
        },
        {
          provide: ConfigService,
          useFactory: () => ({
            get: jest.fn(() => 'https://iq.wiki/sitemap'),
          }),
        },
        {
          provide: DataSource,
          useFactory: () => ({
            findOneBy: jest.fn(() => []),
          }),
        },
      ],
    }).compile()

    controller = moduleRef.get<SitemapController>(SitemapController)

    mockResponse = {
      set: jest.fn().mockImplementation(() => ''),
      send: jest.fn(),
    }
  })

  it('should send the sitemap XML if present', async () => {
    const mockXmlBuffer: Buffer = Buffer.from('<xml>...</xml>')

    controller.sitemapXmlCache = mockXmlBuffer
    await controller.sitemap(mockResponse)

    expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'text/xml')
    expect(mockResponse.send).toHaveBeenCalledWith(mockXmlBuffer)
  })

  it('should create a fresh sitemap and send', async () => {
    const mockXmlBuffer: Buffer = Buffer.from('<xml>...</xml>')
    const mockSitemapStreamInstance = {
      write: jest.fn(),
      end: jest.fn().mockReturnThis(),
    }
    const d = new Date()
    controller.sitemapTimeoutMs = 500
    await controller.sitemap(mockResponse)
    mockSitemapStreamInstance.write({
      url: '',
      changeFreq: '',
      priority: 1,
      lastMod: d,
    })
    mockSitemapStreamInstance.end()
    mockResponse.send(mockXmlBuffer)

    const smStreamWriteSpy = jest.spyOn(mockSitemapStreamInstance, 'write')

    controller.sitemapXmlCache = mockXmlBuffer
    controller.lastmod = d

    expect(mockSitemapStreamInstance.write).toHaveBeenCalledWith({
      url: '',
      changeFreq: '',
      priority: 1,
      lastMod: d,
    })
    expect(smStreamWriteSpy).toHaveBeenCalledWith({
      url: expect.any(String),
      changeFreq: expect.any(String),
      priority: expect.any(Number),
      lastMod: expect.any(Date),
    })
    expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'text/xml')
    expect(mockSitemapStreamInstance.end).toHaveBeenCalled()
    expect(controller.sitemapXmlCache).toBe(mockXmlBuffer)
    expect(mockResponse.send).toHaveBeenCalledWith(mockXmlBuffer)
  })
})
