import { Test, TestingModule } from '@nestjs/testing'
import { DataSource, Repository } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, CacheModule } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'
import { of } from 'rxjs'
import WikiService from '../Wiki/wiki.service'
import Wiki from '../../Database/Entities/wiki.entity'
import Tag from '../../Database/Entities/tag.entity'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'
import { RankType, MarketCapInputs, RankPageIdInputs } from './marketcap.dto'
import MarketCapService from './marketCap.service'

describe('MarketCapService', () => {
  let marketCapService: MarketCapService
  let dataSource: jest.Mocked<DataSource>
  let httpService: jest.Mocked<HttpService>
  let configService: jest.Mocked<ConfigService>
  let wikiService: jest.Mocked<WikiService>
  let cacheManager: jest.Mocked<Cache>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        MarketCapService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn(),
              createQueryBuilder: jest.fn().mockReturnValue({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
                insert: jest.fn().mockResolvedValue(undefined),
                update: jest.fn().mockResolvedValue(undefined),
                into: jest.fn().mockReturnThis(),
                values: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue(undefined),
              }),
              query: jest.fn(),
              insert: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('api-key'),
          },
        },
        {
          provide: WikiService,
          useValue: {
            getFullLinkedWikis: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile()

    marketCapService = module.get<MarketCapService>(MarketCapService)
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>
    httpService = module.get(HttpService) as jest.Mocked<HttpService>
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>
    wikiService = module.get(WikiService) as jest.Mocked<WikiService>
    cacheManager = module.get(CACHE_MANAGER) as jest.Mocked<Cache>
  })

  describe('findWiki', () => {
    it('should return a RankPageWiki object with wiki and blockchain', async () => {
      const marketCapId = { wikiId: 'wiki-id' }
      const wiki = { id: 'wiki-id', title: 'Wiki', linkedWikis: {} }
      const tags = [{ id: 'tag-id' }]

      dataSource
        .getRepository(MarketCapIds)
        .findOne.mockResolvedValue(marketCapId as any)
      dataSource
        .getRepository(Wiki)
        .createQueryBuilder()
        .getOne.mockResolvedValue(wiki as any)
      dataSource.getRepository(Tag).query.mockResolvedValue(tags)
      wikiService.getFullLinkedWikis.mockResolvedValue([])

      const result = await marketCapService['findWiki'](
        'test-id',
        'test-category',
      )

      expect(result).toBeDefined()
      expect(result.wiki).toEqual({ ...wiki, tags })
      expect(result.blockchain).toEqual([])
    })
    it('should find a wiki by coingecko id and category', async () => {
      const mockWiki = { id: 'test-wiki', title: 'Test Wiki' }
      const mockMarketCapId = { wikiId: 'test-wiki-id' }
      ;(dataSource.getRepository as jest.Mock)().findOne.mockResolvedValueOnce(
        mockMarketCapId,
      )
      ;(dataSource.getRepository as jest.Mock)()
        .createQueryBuilder()
        .getOne.mockResolvedValueOnce(mockWiki)
      ;(dataSource.getRepository as jest.Mock)().query.mockResolvedValueOnce([
        { id: 'tag1' },
      ])
      wikiService.getFullLinkedWikis.mockResolvedValue([])

      const result = await (marketCapService as any).findWiki(
        'test-id',
        'test-category',
      )

      expect(result).toEqual({
        wiki: { ...mockWiki, tags: [{ id: 'tag1' }] },
        founders: [],
        blockchain: [],
      })
    })
  })

  describe('crypoMarketData', () => {
    it('should fetch and process market data', async () => {
      const apiResponse = [
        { id: 'btc', name: 'bitcoin', symbol: 'BTC', current_price: 60000 },
      ]

      jest
        .spyOn(marketCapService as any, 'cgMarketDataApiCall')
        .mockResolvedValue(apiResponse)
      jest
        .spyOn(marketCapService as any, 'findWiki')
        .mockResolvedValue({ wiki: { id: 'btc-wiki' } })

      const result = await marketCapService.marketData(RankType.TOKEN)

      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('tokenMarketData')
      expect(result[0].tokenMarketData.name).toBe('bitcoin')
    })
    it('should return market data for tokens', async () => {
      const mockCgData = [
        { id: 'bitcoin', name: 'Bitcoin', current_price: 50000 },
      ]
      const mockWikiData = [
        {
          wiki: { id: 'bitcoin', title: 'Bitcoin' },
          founders: [],
          blockchain: [],
        },
      ]

      jest
        .spyOn(marketCapService as any, 'cgMarketDataApiCall')
        .mockResolvedValueOnce(mockCgData)
      jest
        .spyOn(marketCapService as any, 'getWikiData')
        .mockResolvedValueOnce(mockWikiData)

      const result = await marketCapService.marketData(RankType.TOKEN)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('tokenMarketData')
      expect(result[0].tokenMarketData).toHaveProperty('id', 'bitcoin')
    })
  })

  describe('updateMistachIds', () => {
    it('should update existing record', async () => {
      ;(dataSource.getRepository as jest.Mock)().findOne.mockResolvedValueOnce({
        id: 'existing-id',
      })

      const result = await marketCapService.updateMistachIds({
        coingeckoId: 'test-id',
        wikiId: 'test-wiki-id',
        kind: RankType.TOKEN,
      })

      expect(result).toBe(true)
      expect(dataSource.getRepository(MarketCapIds).update).toHaveBeenCalled()
    })

    it('should insert new record if it does not exists', async () => {
      ;(dataSource.getRepository as jest.Mock)().findOne.mockResolvedValueOnce(
        null,
      )

      const result = await marketCapService.updateMistachIds({
        coingeckoId: 'test-id',
        wikiId: 'test-wiki-id',
        kind: RankType.TOKEN,
      })

      expect(result).toBe(true)
      expect(dataSource.getRepository(MarketCapIds).insert).toHaveBeenCalled()
    })
  })

  describe('cgMarketDataApiCall', () => {
    it('should handle API call errors gracefully', async () => {
      httpService.get.mockReturnValue(
        of(Promise.reject(new Error('API call failed'))),
      )

      const result = await marketCapService['cgMarketDataApiCall'](
        RankType.TOKEN,
      )

      expect(result).toEqual([])
    })
  })
})
