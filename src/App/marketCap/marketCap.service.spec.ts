import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER, CacheModule } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import WikiService from '../Wiki/wiki.service'
import { RankType, TokenCategory } from './marketcap.dto'
import MarketCapService from './marketCap.service'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'

describe('MarketCapService', () => {
  let marketCapService: MarketCapService
  let dataSource: jest.Mocked<DataSource>
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
  })

  it('should be defined', () => {
    expect(marketCapService).toBeDefined()
  })

  describe('getCacheKey', () => {
    it('should return correct key for tokens', () => {
      expect(
        marketCapService.getCacheKey({
          kind: RankType.TOKEN,
          offset: 0,
          limit: 10,
        }),
      ).toBe('default-list')
      expect(
        marketCapService.getCacheKey({
          kind: RankType.TOKEN,
          category: TokenCategory.STABLE_COINS,
          offset: 0,
          limit: 10,
        }),
      ).toBe('stablecoins-list')
      expect(
        marketCapService.getCacheKey({
          kind: RankType.TOKEN,
          category: TokenCategory.AI,
          offset: 0,
          limit: 10,
        }),
      ).toBe('ai-coins-list')
    })

    it('should return correct key for NFTs', () => {
      expect(
        marketCapService.getCacheKey({
          kind: RankType.NFT,
          offset: 0,
          limit: 10,
        }),
      ).toBe('nft-list')
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
  describe('wildcardSearch', () => {
    const cacheData = [
      { tokenMarketData: { id: 'bitcoin', name: 'Bitcoin' } },
      { tokenMarketData: { id: 'ethereum', name: 'Ethereum' } },
      { nftMarketData: { id: 'coin', name: 'Coin' } },
    ]
    it('should return filtered results based on search term', async () => {
      jest
        .spyOn(marketCapService, 'ranks')
        .mockResolvedValueOnce(cacheData as any)

      const result = await marketCapService.wildcardSearch({
        kind: RankType.TOKEN,
        category: TokenCategory.STABLE_COINS,
        offset: 0,
        limit: 10,
        search: 'bit',
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        tokenMarketData: { id: 'bitcoin', name: 'Bitcoin' },
      })
    })

    it('should return empty array for non-matching search term', async () => {
      const result = await marketCapService.wildcardSearch({
        kind: RankType.TOKEN,
        category: TokenCategory.STABLE_COINS,
        offset: 0,
        limit: 10,
        search: 'iq',
      })

      expect(result).toHaveLength(0)
    })
  })
})
