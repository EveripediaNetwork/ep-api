import { createQueryBuilder, DataSource, Repository } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import {
  MarketCapInputs,
  RankPageIdInputs,
  RankType,
  TokenRankListData,
} from './marketcap.dto'
import WikiService from '../Wiki/wiki.service'
import MarketCapService from './marketCap.service'
import { Test, TestingModule } from '@nestjs/testing'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import { of } from 'rxjs'

describe('MarketCapService', () => {
  let marketCapService: MarketCapService
  let dataSource: DataSource
  let httpService: HttpService
  let configService: ConfigService
  let wikiService: WikiService
  let cacheManager: Cache
  let wikiRepository: Repository<Wiki>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketCapService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn(),
              createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
                insert: jest.fn().mockReturnThis(),
                into: jest.fn().mockReturnThis(),
                values: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue(undefined),
              }),
              query: jest
                .fn()
                .mockResolvedValueOnce([{ id: 'tid1' }, { id: 'tid2' }]),
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
            get: jest.fn(),
          },
        },
        {
          provide: WikiService,
          useValue: {
            getFullLinkedWikis: jest.fn(),
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
    dataSource = module.get<DataSource>(DataSource)
    httpService = module.get<HttpService>(HttpService)
    configService = module.get<ConfigService>(ConfigService)
    wikiService = module.get<WikiService>(WikiService)
    wikiRepository = dataSource.getRepository(Wiki)
    cacheManager = module.get<Cache>(CACHE_MANAGER)
  })

  describe('cryptoMarketData', () => {
    it('should fetch and process crypto market data', async () => {
      const apiResponse = {
        data: [
          { id: 'btc', name: 'bitcoin', symbol: 'BTC', current_price: 60000 },
        ],
      }

      jest
        .spyOn(marketCapService as any, 'cgMarketDataApiCall')
        .mockResolvedValue(apiResponse)
      jest
        .spyOn(marketCapService as any, 'findWiki')
        .mockResolvedValue({ id: 'btc-wiki' })

      const result = await (marketCapService as any).cryptoMarketData({
        category: 'cryptocurrency',
      })

      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(1)

      const firstItem = await result[0]

      expect(firstItem).toHaveProperty('tokenMarketData')
      expect(firstItem.tokenMarketData.name).toBe('bitcoin')
    })
  })

  describe('ranks', () => {
    it('should return cached result if available', async () => {
      const args: MarketCapInputs = {
        limit: 10,
        offset: 0,
        kind: RankType.TOKEN,
        founders: false,
      }

      const cachedResult = [{ id: 'result' }]
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(cachedResult)

      const result = await marketCapService.ranks(args)

      expect(result).toEqual(cachedResult)
      expect(cacheManager.get).toHaveBeenCalledWith(
        `finalResult/${args.kind}/${args.limit}/${args.offset}/${args.founders}`,
      )
    })

    it('should handle RankType.NFT correctly', async () => {
      const args: MarketCapInputs = {
        limit: 10,
        offset: 0,
        kind: RankType.NFT,
        founders: false,
      }

      const apiResponse = {
        data: [
          {
            id: '1',
            name: 'NFT 1',
            image: { small: '' },
            native_currency: '',
            native_currency_symbol: '',
            floor_price: { native_currency: 2, usd: 1 },
            market_cap: { usd: 1 },
            volume_24h: { usd: 1, native_currency: 0 },
            floor_price_in_usd_24h_percentage_change: 0,
          },
        ],
      }

      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(undefined)
      jest
        .spyOn(marketCapService, 'cgMarketDataApiCall')
        .mockResolvedValueOnce(apiResponse)
      jest
        .spyOn(marketCapService, 'findWikiByCoingeckoUrl')
        .mockResolvedValueOnce(null)

      const result = await marketCapService.ranks(args)

      expect(result).toHaveLength(apiResponse.data.length)
      expect(cacheManager.set).toHaveBeenCalled()
    })

    it('should fetch and cache result if not available in cache', async () => {
      const args: MarketCapInputs = {
        limit: 10,
        offset: 0,
        kind: RankType.TOKEN,
        founders: false,
      }

      const apiResponse = {
        data: [
          {
            id: '1',
            image: '',
            name: 'Token 1',
            symbol: 'TK1',
            current_price: 100,
            market_cap: 1000,
            market_cap_rank: 1,
            price_change_percentage_24h: 0,
            market_cap_change_24h: 0,
          },
        ],
      }

      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(undefined)
      jest
        .spyOn(marketCapService, 'cgMarketDataApiCall')
        .mockResolvedValueOnce(apiResponse)
      jest
        .spyOn(marketCapService, 'findWikiByCoingeckoUrl')
        .mockResolvedValueOnce(null)

      const result = await marketCapService.ranks(args)

      expect(result).toHaveLength(apiResponse.data.length)
      expect(cacheManager.set).toHaveBeenCalled()
    })
  })

  describe('updateMistachIds', () => {
    it('should successfully insert data', async () => {
      const args: RankPageIdInputs = {
        coingeckoId: 'coinId',
        wikiId: 'wikiId',
        kind: RankType.TOKEN,
      }
      const marketCapIdRepository = dataSource.getRepository(MarketCapIds)
      const queryBuilder = marketCapIdRepository.createQueryBuilder() as any

      jest
        .spyOn(marketCapIdRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder)

      const result = await marketCapService.updateMistachIds(args)

      expect(result).toBe(true)
      expect(marketCapIdRepository.createQueryBuilder).toHaveBeenCalledWith()
      expect(queryBuilder.insert).toHaveBeenCalled()
      expect(queryBuilder.into).toHaveBeenCalledWith(MarketCapIds)
      expect(queryBuilder.values).toHaveBeenCalledWith(args)
      expect(queryBuilder.execute).toHaveBeenCalled()
    })

    it('should handle errors during insertion', async () => {
      const args: RankPageIdInputs = {
        coingeckoId: 'coinId',
        wikiId: 'wikiId',
        kind: RankType.TOKEN,
      }

      const marketCapIdRepository = dataSource.getRepository(MarketCapIds)
      const queryBuilder = marketCapIdRepository.createQueryBuilder()

      jest
        .spyOn(marketCapIdRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder)
      jest
        .spyOn(queryBuilder, 'execute')
        .mockRejectedValueOnce(new Error('Insertion error'))

      const result = await marketCapService.updateMistachIds(args)

      expect(result).toBe(false)
      expect(marketCapIdRepository.createQueryBuilder).toHaveBeenCalled()
      expect(queryBuilder.insert).toHaveBeenCalled()
      expect(queryBuilder.execute).toHaveBeenCalled()
    })
  })

  describe('cgMarketDataApiCall', () => {
    it('should make a successful API call', async () => {
      const args: MarketCapInputs = {
        limit: 10,
        offset: 0,
        kind: RankType.TOKEN,
        founders: false,
      }

      const apiResponse = {
        data: [
          {
            id: 'btc',
          },
        ],
      }

      ;(httpService.get as jest.Mock).mockReturnValue(of(apiResponse))
      ;(configService.get as jest.Mock).mockReturnValue('apiKey')

      const result = await (marketCapService as any).cgMarketDataApiCall(args)

      expect(result).toEqual(apiResponse)
      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'x-cg-pro-api-key': 'apiKey' },
        }),
      )
    })
  })
})
