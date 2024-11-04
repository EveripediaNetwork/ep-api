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
import Pm2Service from '../utils/pm2Service'
import Events from '../../Database/Entities/Event.entity'

describe('MarketCapService', () => {
  let marketCapService: MarketCapService
  let httpService: HttpService
  let dataSource: Partial<DataSource>
  let configService: Partial<ConfigService>
  let wikiService: Partial<WikiService>
  let cacheManager: jest.Mocked<any>
  let wikiRepository: jest.Mocked<Repository<Wiki>>
  let marketCapIdRepository: jest.Mocked<Repository<MarketCapIds>>
  let pm2Service: jest.Mocked<Pm2Service>
  let eventsRepository: jest.Mocked<Repository<Events>>

  beforeEach(async () => {
    const setupRepositories = () => {
      wikiRepository = {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
          clone: jest.fn().mockReturnThis(),
        }),
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

      marketCapIdRepository = {
        findOne: jest.fn(),
        update: jest.fn(),
        insert: jest.fn(),
      } as any

      eventsRepository = {
        query: jest.fn(),
      } as any
    }

    setupRepositories()

    dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === Wiki) return wikiRepository
        if (entity === MarketCapIds) return marketCapIdRepository
        if (entity === Events) return eventsRepository
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
      get: jest.fn(() => 'mock-api-key'),
    }

    wikiService = {}

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    }

    pm2Service = {
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      sendDataToProcesses: jest.fn().mockResolvedValue(undefined),
      pm2Ids: new Map(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketCapService,
        { provide: DataSource, useValue: dataSource },
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
        { provide: WikiService, useValue: wikiService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: Pm2Service, useValue: pm2Service },
      ],
    }).compile()

    marketCapService = module.get<MarketCapService>(MarketCapService)
    dataSource = module.get<DataSource>(DataSource)
    httpService = module.get<HttpService>(HttpService)
    configService = module.get<ConfigService>(ConfigService)
    wikiService = module.get<WikiService>(WikiService)
    cacheManager = module.get(CACHE_MANAGER)

    delete process.env.pm_id
  })

  it('should be defined', () => {
    expect(marketCapService).toBeDefined()
  })

  describe('findWiki', () => {
    it('should return cached wiki if available', async () => {
      const cachedWiki = {
        wiki: { id: 'test-id', title: 'Test Wiki' },
        founders: [],
        blockchain: [],
      }
      cacheManager.get.mockResolvedValue(cachedWiki)

      const result = await (marketCapService as any).findWiki(
        'test-id',
        'cryptocurrencies',
      )

      expect(result).toEqual(cachedWiki)
      expect(cacheManager.get).toHaveBeenCalledWith('test-id')
    })
  })

  describe('getWikiData', () => {
    it('should return wiki data for given coins', async () => {
      const coinsData = [{ id: 'iqcoin' }, { id: 'iqcoin2' }]
      const wikiData = [{ wiki: { id: 'iqcoin' } }, { wiki: { id: 'iqcoin' } }]
      ;(marketCapService as any).findWiki = jest
        .fn()
        .mockResolvedValueOnce(wikiData[0])
        .mockResolvedValueOnce(wikiData[1])

      const result = await marketCapService.getWikiData(
        coinsData,
        RankType.TOKEN,
      )

      expect(result).toEqual(wikiData)
      expect((marketCapService as any).findWiki).toHaveBeenCalledTimes(2)
    })
  })

  describe('marketData', () => {
    it('should return processed market data', async () => {
      const mockArgs = { kind: RankType.TOKEN, limit: 2, offset: 10 }
      const cgData = [{ id: 'iqcoin', name: 'IqCoin' }]
      const wikiData = [
        { wiki: { id: 'iqcoin' }, founders: [], blockchain: [] },
      ]
      ;(marketCapService as any).cgMarketDataApiCall = jest
        .fn()
        .mockResolvedValue(cgData)
      marketCapService.getWikiData = jest.fn().mockResolvedValue(wikiData)

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

      const result = await marketCapService.cgMarketDataApiCall(
        {
          kind: RankType.TOKEN,
          category: TokenCategory.STABLE_COINS,
          limit: 10,
          offset: 0,
        },
        false,
      )

      expect(result).toEqual(cachedData)
      expect(cacheManager.get).toHaveBeenCalled()
      expect(httpService.get).not.toHaveBeenCalled()
    })
  })

  describe('ranks', () => {
    it('should return rank data', async () => {
      const mockArgs = { kind: RankType.TOKEN, limit: 2, offset: 10 }
      const marketData = [{ tokenMarketData: { id: 'iqcoin' } }]
      marketCapService.marketData = jest.fn().mockResolvedValue(marketData)

      const result = await marketCapService.ranks(mockArgs)

      expect(result).toEqual(marketData)
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
    it('should update existing record, clear relevant caches, and notify PM2', async () => {
      process.env.pm_id = '1'
      const mockArgs = {
        coingeckoId: 'test-coin',
        kind: RankType.TOKEN,
        wikiId: 'wiki1',
        offset: 0,
        limit: 10,
      }

      const existingRecord = {
        coingeckoId: 'test-coin',
        wikiId: 'old-wiki',
      }

      marketCapIdRepository.findOne.mockResolvedValue(existingRecord)
      jest.spyOn(marketCapService, 'marketData').mockResolvedValue([])

      const result = await marketCapService.updateMistachIds(mockArgs)

      expect(result).toBe(true)
      expect(cacheManager.del).toHaveBeenCalledWith('old-wiki')
      expect(cacheManager.del).toHaveBeenCalledWith('test-coin')
      expect(pm2Service.sendDataToProcesses).toHaveBeenCalled()
    })
    it('should insert new record and clear caches when record does not exist', async () => {
      const mockArgs = {
        coingeckoId: 'new-coin',
        kind: RankType.TOKEN,
        wikiId: 'wiki1',
        offset: 0,
        limit: 10,
      }

      marketCapIdRepository.findOne.mockResolvedValue(null)
      marketCapIdRepository.insert.mockResolvedValue(undefined)
      jest.spyOn(marketCapService, 'marketData').mockResolvedValue([])

      const result = await marketCapService.updateMistachIds(mockArgs)

      expect(result).toBe(true)
      expect(marketCapIdRepository.insert).toHaveBeenCalledWith({
        coingeckoId: mockArgs.coingeckoId,
        kind: 'cryptocurrencies',
        wikiId: mockArgs.wikiId,
      })
    })
  })

  describe('wildcardSearch', () => {
    it('should return filtered results based on search term', async () => {
      const data = {
        tokens: [
          { tokenMarketData: { id: 'bitcoin', name: 'Bitcoin' } },
          { tokenMarketData: { id: 'ethereum', name: 'Ethereum' } },
        ],
      }
      cacheManager.get.mockResolvedValue(data)

      const result = await marketCapService.wildcardSearch({
        kind: RankType.TOKEN,
        search: 'bit',
        limit: 2,
        offset: 0,
      })

      expect(result).toEqual([data.tokens[0]])
    })

    it('should return empty array if search term is not provided', async () => {
      const result = await marketCapService.wildcardSearch({
        kind: RankType.TOKEN,
        search: '',
        limit: 2,
        offset: 0,
      })
      expect(result).toEqual([])
    })

    it('should return empty array if cache is empty', async () => {
      cacheManager.get.mockResolvedValue(undefined)
      const result = await marketCapService.wildcardSearch({
        kind: RankType.TOKEN,
        search: 'test',
        limit: 2,
        offset: 0,
      })
      expect(result).toEqual([])
    })
  })
})
