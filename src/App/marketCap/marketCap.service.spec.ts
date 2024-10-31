import { Test, TestingModule } from '@nestjs/testing'
import { DataSource, Repository } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { of } from 'rxjs'
import WikiService from '../Wiki/wiki.service'
import { RankType, TokenCategory } from './marketcap.dto'
import MarketCapService from './marketCap.service'
import Wiki from '../../Database/Entities/wiki.entity'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'

describe('MarketCapService', () => {
  let marketCapService: MarketCapService
  let httpService: HttpService
  let dataSource: Partial<DataSource>
  let configService: Partial<ConfigService>
  let wikiService: Partial<WikiService>
  let cacheManager: jest.Mocked<any>
  let wikiRepository: jest.Mocked<Repository<Wiki>>
  let marketCapIdRepository: jest.Mocked<Repository<MarketCapIds>>

  beforeEach(async () => {
    dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === Wiki) return wikiRepository
        if (entity === MarketCapIds) return marketCapIdRepository
        return {} as any
      }),
    }

    httpService = {
      get: jest.fn(() =>
        of({
          data: 'mocked response',
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        }),
      ),
    } as any

    configService = {
      get: jest.fn(),
    }

    wikiService = {}

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketCapService,
        { provide: DataSource, useValue: dataSource },
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
        { provide: WikiService, useValue: wikiService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile()

    wikiRepository = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      findOne: jest.fn(),
    } as any

    marketCapService = module.get<MarketCapService>(MarketCapService)
    dataSource = module.get<DataSource>(DataSource)
    httpService = module.get<HttpService>(HttpService)
    configService = module.get<ConfigService>(ConfigService)
    wikiService = module.get<WikiService>(WikiService)
    cacheManager = module.get(CACHE_MANAGER)

    marketCapIdRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
    } as any
  })

  it('should be defined', () => {
    expect(marketCapService).toBeDefined()
  })

  describe('findWiki', () => {
    it('should return cached wiki if available', async () => {
      const cachedWiki = { wiki: {}, founders: [], blockchain: [] }
      cacheManager.get.mockResolvedValue(cachedWiki)

      const result = await (marketCapService as any).findWiki(
        'test-id',
        'cryptocurrencies',
      )

      expect(result).toEqual(cachedWiki)
      expect(cacheManager.get).toHaveBeenCalledWith('test-id')
    })

    it('should fetch wiki from database if not in cache', async () => {
      cacheManager.get.mockResolvedValue(undefined)
      const mockWiki = { id: 'test-id', title: 'Test Wiki' }
      wikiRepository.getOne.mockResolvedValue(mockWiki)

      const result = await marketCapService['findWiki'](
        'test-id',
        'cryptocurrencies',
      )

      expect(result).toEqual({ wiki: mockWiki, founders: [], blockchain: [] })
      expect(wikiRepository.getOne).toHaveBeenCalled()
      expect(cacheManager.set).toHaveBeenCalled()
    })
  })

  describe('getWikiData', () => {
    it('should return wiki data for given coins', async () => {
      const mockCoinsData = [{ id: 'iqcoin' }, { id: 'iqcoin2' }]
      const mockWikiData = [
        { wiki: { id: 'iqcoin' } },
        { wiki: { id: 'iqcoin' } },
      ]
      ;(marketCapService as any).findWiki = jest
        .fn()
        .mockResolvedValueOnce(mockWikiData[0])
        .mockResolvedValueOnce(mockWikiData[1])

      const result = await marketCapService.getWikiData(
        mockCoinsData,
        RankType.TOKEN,
      )

      expect(result).toEqual(mockWikiData)
      expect((marketCapService as any).findWiki).toHaveBeenCalledTimes(2)
    })
  })

  describe('marketData', () => {
    it('should return processed market data', async () => {
      const mockArgs = { kind: RankType.TOKEN, limit: 2, offset: 10 }
      const mockCgData = [{ id: 'iqcoin', name: 'IqCoin' }]
      const mockWikiData = [
        { wiki: { id: 'iqcoin' }, founders: [], blockchain: [] },
      ]
      ;(marketCapService as any).cgMarketDataApiCall = jest
        .fn()
        .mockResolvedValue(mockCgData)
      marketCapService.getWikiData = jest.fn().mockResolvedValue(mockWikiData)

      const result = await marketCapService.marketData(mockArgs)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('tokenMarketData')
      expect(result[0].tokenMarketData).toHaveProperty('hasWiki', true)
    })
  })

  describe('cgMarketDataApiCall', () => {
    it('should return cached data if available', async () => {
      const cachedData = [{ id: 'bitcoin', name: 'Bitcoin' }]
      cacheManager.get.mockResolvedValue(cachedData)

      const result = await marketCapService.cgMarketDataApiCall({
        kind: RankType.TOKEN,
        category: TokenCategory.STABLE_COINS,
        limit: 10,
        offset: 0,
      })

      expect(result).toEqual(cachedData)
      expect(cacheManager.get).toHaveBeenCalled()
      expect(httpService.get).not.toHaveBeenCalled()
    })
  })

  describe('ranks', () => {
    it('should return rank data', async () => {
      const mockArgs = { kind: RankType.TOKEN, limit: 2, offset: 10 }
      const mockMarketData = [{ tokenMarketData: { id: 'iqcoin' } }]
      marketCapService.marketData = jest.fn().mockResolvedValue(mockMarketData)

      const result = await marketCapService.ranks(mockArgs)

      expect(result).toEqual(mockMarketData)
    })
  })

  describe('getCacheKey', () => {
    it('should return correct cache key for different inputs', () => {
      expect(
        marketCapService.getCacheKey({
          kind: RankType.TOKEN,
          limit: 2,
          offset: 10,
        }),
      ).toBe('default-list')
      expect(
        marketCapService.getCacheKey({
          kind: RankType.TOKEN,
          category: TokenCategory.STABLE_COINS,
          limit: 2,
          offset: 10,
        }),
      ).toBe('stablecoins-list')
      expect(
        marketCapService.getCacheKey({
          kind: RankType.TOKEN,
          category: TokenCategory.AI,
          limit: 2,
          offset: 10,
        }),
      ).toBe('ai-coins-list')
      expect(
        marketCapService.getCacheKey({
          kind: RankType.NFT,
          limit: 2,
          offset: 10,
        }),
      ).toBe('nft-list')
    })
  })

  describe('updateMistachIds', () => {
    it('should update existing record and delete from cache', async () => {
      const mockArgs = {
        coingeckoId: 'iqcoin',
        wikiId: 'wiki1',
        kind: RankType.TOKEN,
      }

      marketCapIdRepository.findOne.mockResolvedValue({
        coingeckoId: 'iqcoin',
        wikiId: 'old-wiki',
        kind: RankType.TOKEN,
        linked: false,
      })

      cacheManager.del.mockResolvedValue(undefined)
      const result = await marketCapService.updateMistachIds(mockArgs)

      expect(result).toBeDefined()
      expect(result).toBe(true)
      expect(marketCapIdRepository.update).toHaveBeenCalledWith(
        { coingeckoId: mockArgs.coingeckoId },
        mockArgs,
      )
      expect(cacheManager.del).toHaveBeenCalledWith(
        `mismatch-${mockArgs.coingeckoId}`,
      )
    })

    it('should insert new record if it does not exist and delete from cache', async () => {
      const mockArgs = {
        coingeckoId: 'iqcoin2',
        wikiId: 'wiki2',
        kind: RankType.TOKEN,
      }

      marketCapIdRepository.findOne.mockResolvedValue(null)

      cacheManager.del.mockResolvedValue(undefined)
      const result = await marketCapService.updateMistachIds(mockArgs)

      expect(result).toBeDefined()
      expect(result).toBe(true)
      expect(marketCapIdRepository.insert).toHaveBeenCalledWith({
        ...mockArgs,
        linked: false,
      })
      expect(cacheManager.del).toHaveBeenCalledWith(
        `mismatch-${mockArgs.coingeckoId}`,
      )
    })
  })

  describe('wildcardSearch', () => {
    it('should return filtered results based on search term', async () => {
      const mockRanks = [
        { tokenMarketData: { id: 'bitcoin', name: 'Bitcoin' } },
        { tokenMarketData: { id: 'ethereum', name: 'Ethereum' } },
      ]
      jest.spyOn(marketCapService, 'ranks').mockResolvedValue(mockRanks as any)

      const result = await marketCapService.wildcardSearch({
        kind: RankType.TOKEN,
        search: 'bit',
        limit: 2,
        offset: 10,
      })

      expect(result).toEqual([mockRanks[0]])
    })
    it('should return empty array if search term is not provided', async () => {
      const result = await marketCapService.wildcardSearch({
        kind: RankType.TOKEN,
        search: '',
        limit: 2,
        offset: 10,
      })
      expect(result).toEqual([])
    })
  })
})
