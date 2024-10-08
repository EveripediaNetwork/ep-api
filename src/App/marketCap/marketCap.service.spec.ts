import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { of } from 'rxjs'
import WikiService from '../Wiki/wiki.service'
import { RankType, TokenCategory } from './marketcap.dto'
import MarketCapService from './marketCap.service'

describe('MarketCapService', () => {
  let marketCapService: MarketCapService
  let dataSourceMock: Partial<DataSource>
  let httpServiceMock: Partial<HttpService>
  let configServiceMock: Partial<ConfigService>
  let wikiServiceMock: Partial<WikiService>
  let cacheManagerMock: any

  beforeEach(async () => {
    dataSourceMock = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        update: jest.fn(),
        insert: jest.fn(),
      }),
    }

    httpServiceMock = {
      get: jest.fn(),
    }

    configServiceMock = {
      get: jest.fn().mockReturnValue('mock_api_key'),
    }

    wikiServiceMock = {}

    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketCapService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: WikiService, useValue: wikiServiceMock },
        { provide: CACHE_MANAGER, useValue: cacheManagerMock },
      ],
    }).compile()

    marketCapService = module.get<MarketCapService>(MarketCapService)
  })

  it('should be defined', () => {
    expect(marketCapService).toBeDefined()
  })

  describe('findWiki', () => {
    it('should return cached wiki if available', async () => {
      const cachedWiki = { wiki: {}, founders: [], blockchain: [] }
      cacheManagerMock.get.mockResolvedValue(cachedWiki)

      const result = await (marketCapService as any).findWiki(
        'test-id',
        'cryptocurrencies',
      )

      expect(result).toEqual(cachedWiki)
      expect(cacheManagerMock.get).toHaveBeenCalledWith('test-id')
    })

    // it('should fetch and cache wiki if not in cache', async () => {
    //   cacheManagerMock.get.mockResolvedValue(undefined)
    //   const mockWiki = { id: 'test-id', title: 'Test Wiki' }
    //   ;(
    //     dataSourceMock.getRepository('Wiki').createQueryBuilder()
    //       .getOne as jest.Mock
    //   ).mockResolvedValue(mockWiki)

    //   const result = await (marketCapService as any).findWiki(
    //     'test-id',
    //     'cryptocurrencies',
    //   )

    //   expect(result).toEqual({ wiki: mockWiki, founders: [], blockchain: [] })
    //   expect(cacheManagerMock.set).toHaveBeenCalled()
    // })
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

  //   describe('cgMarketDataApiCall', () => {
  //     it('should fetch market data from CoinGecko API', async () => {
  //       const mockArgs = { kind: RankType.TOKEN, limit: 10 }
  //       const mockResponse = { data: [{ id: 'iqcoin' }] }
  //       ;(httpServiceMock.get as jest.Mock).mockReturnValue(of(mockResponse))

  //       const result = await (marketCapService as any).cgMarketDataApiCall(mockArgs)

  //       expect(result).toEqual(mockResponse.data)
  //       expect(httpServiceMock.get).toHaveBeenCalled()
  //     })
  //   })

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
    it('should update existing record', async () => {
      const mockArgs = {
        coingeckoId: 'iqcoin',
        wikiId: 'wiki1',
        kind: RankType.TOKEN,
      }
      ;(
        dataSourceMock.getRepository('MarketCapIds').findOne as jest.Mock
      ).mockResolvedValue({ coingeckoId: 'iqcoin' })

      const result = await marketCapService.updateMistachIds(mockArgs)

      expect(result).toBe(true)
      expect(
        dataSourceMock.getRepository('MarketCapIds').update,
      ).toHaveBeenCalled()
    })

    it('should insert new record if not exists', async () => {
      const mockArgs = {
        coingeckoId: 'iqcoin2',
        wikiId: 'wiki2',
        kind: RankType.TOKEN,
      }
      ;(
        dataSourceMock.getRepository('MarketCapIds').findOne as jest.Mock
      ).mockResolvedValue(null)

      const result = await marketCapService.updateMistachIds(mockArgs)

      expect(result).toBe(true)
      expect(
        dataSourceMock.getRepository('MarketCapIds').insert,
      ).toHaveBeenCalled()
    })
  })

  //   describe('wildcardSearch', () => {
  //     it('should return filtered results based on search term', async () => {
  //       const mockArgs = { kind: RankType.TOKEN, search: 'iqcoin,',
  //         limit: 2,
  //         offset: 10, }
  //       const mockRanks = [
  //         { tokenMarketData: { id: 'iqcoin', name: 'Iq Coin' } },
  //         { tokenMarketData: { id: 'token2', name: 'Token Two' } },
  //       ]
  //       marketCapService.ranks = jest.fn().mockResolvedValue(mockRanks)

  //       const result = await marketCapService.wildcardSearch(mockArgs)

  //       expect(result).toHaveLength(1)
  //       expect(result[0].tokenMarketData.id).toBe('iqcoin')
  //     })
  //   })
})
