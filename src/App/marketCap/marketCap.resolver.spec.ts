import { Test, TestingModule } from '@nestjs/testing'
import { MarketCapInputs, RankPageIdInputs, RankType } from './marketcap.dto'
import MarketCapService from './marketCap.service'
import MarketCapResolver from './marketCap.resolver'

describe('MarketCapResolver', () => {
  let marketCapResolver: MarketCapResolver
  let mockMarketCapService: Partial<MarketCapService>

  beforeEach(async () => {
    mockMarketCapService = {
      ranks: jest.fn(),
      updateMistachIds: jest.fn(),
      wildcardSearch: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketCapResolver,
        { provide: MarketCapService, useValue: mockMarketCapService },
      ],
    }).compile()

    marketCapResolver = module.get<MarketCapResolver>(MarketCapResolver)
  })

  it('should be defined', () => {
    expect(marketCapResolver).toBeDefined()
  })

  describe('rankList', () => {
    it('should return rank list data', async () => {
      const mockArgs: MarketCapInputs = {
        kind: RankType.TOKEN,
        limit: 2,
        offset: 10,
      }
      const mockRankData = [{ id: 'token1', name: 'Token 1' }]
      ;(mockMarketCapService.ranks as jest.Mock).mockResolvedValue(mockRankData)

      const result = await marketCapResolver.rankList(mockArgs)

      expect(result).toEqual(mockRankData)
      expect(mockMarketCapService.ranks).toHaveBeenCalledWith(mockArgs)
    })
  })

  describe('rankPageIds', () => {
    it('should update rank page ids', async () => {
      const mockArgs: RankPageIdInputs = {
        coingeckoId: 'iqcoin',
        wikiId: 'wiki1',
        kind: RankType.TOKEN,
      }
      ;(mockMarketCapService.updateMistachIds as jest.Mock).mockResolvedValue(
        true,
      )

      const result = await marketCapResolver.rankPageIds(mockArgs)

      expect(result).toBe(true)
      expect(mockMarketCapService.updateMistachIds).toHaveBeenCalledWith(
        mockArgs,
      )
    })
  })

  describe('searchRank', () => {
    it('should return search results', async () => {
      const mockArgs: MarketCapInputs = {
        kind: RankType.TOKEN,
        search: 'bitcoin',
        limit: 2,
        offset: 10,
      }
      const mockSearchResults = [{ id: 'bitcoin', name: 'Bitcoin' }]
      ;(mockMarketCapService.wildcardSearch as jest.Mock).mockResolvedValue(
        mockSearchResults,
      )

      const result = await marketCapResolver.searchRank(mockArgs)

      expect(result).toEqual(mockSearchResults)
      expect(mockMarketCapService.wildcardSearch).toHaveBeenCalledWith(mockArgs)
    })
  })

  describe('linkWikiToRankData', () => {
    it('should link wiki to rank data with valid wikiId', async () => {
      const mockArgs: RankPageIdInputs = {
        coingeckoId: 'iqcoin',
        wikiId: 'wiki1',
        kind: RankType.TOKEN,
      }
      ;(mockMarketCapService.updateMistachIds as jest.Mock).mockResolvedValue(
        true,
      )

      const result = await marketCapResolver.linkWikiToRankData(mockArgs)

      expect(result).toBe(true)
      expect(mockMarketCapService.updateMistachIds).toHaveBeenCalledWith(
        mockArgs,
      )
    })

    it('should extract slug from URL in wikiId', async () => {
      const mockArgs: RankPageIdInputs = {
        coingeckoId: 'iqcoin',
        wikiId: 'https://iqcoin.com/wiki/bitcoin/',
        kind: RankType.TOKEN,
      }
      ;(mockMarketCapService.updateMistachIds as jest.Mock).mockResolvedValue(
        true,
      )

      const result = await marketCapResolver.linkWikiToRankData(mockArgs)

      expect(result).toBe(true)
      expect(mockMarketCapService.updateMistachIds).toHaveBeenCalledWith({
        ...mockArgs,
        wikiId: 'bitcoin',
      })
    })

    it('should return false for invalid wikiId', async () => {
      const mockArgs: RankPageIdInputs = {
        coingeckoId: 'iqcoin',
        wikiId: '',
        kind: RankType.TOKEN,
      }

      const result = await marketCapResolver.linkWikiToRankData(mockArgs)

      expect(result).toBe(false)
      expect(mockMarketCapService.updateMistachIds).not.toHaveBeenCalled()
    })

    it('should return false and log error on exception', async () => {
      const mockArgs: RankPageIdInputs = {
        coingeckoId: 'iqcoin',
        wikiId: 'wiki1',
        kind: RankType.TOKEN,
      }
      ;(mockMarketCapService.updateMistachIds as jest.Mock).mockRejectedValue(
        new Error('Test error'),
      )
      console.error = jest.fn()

      const result = await marketCapResolver.linkWikiToRankData(mockArgs)

      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalled()
    })
  })

//   describe('extractSlug', () => {
//     it('should extract slug from URL', () => {
//       const extractSlug = (marketCapResolver as any).constructor.prototype
//         .extractSlug
  
//       expect(extractSlug('https://iqcoin.com/wiki/bitcoin/')).toBe('bitcoin')
//       expect(extractSlug('https://iqcoin.com/wiki/ethereum')).toBe('ethereum')
//       expect(extractSlug('https://iqcoin.com/')).toBe('iqcoin.com')
//       expect(extractSlug('bitcoin')).toBe('bitcoin')
//     })
//   })
  
})
