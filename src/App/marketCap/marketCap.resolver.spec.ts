import { Test, TestingModule } from '@nestjs/testing'
import { MarketCapInputs, RankPageIdInputs, RankType } from './marketcap.dto'
import MarketCapService from './marketCap.service'
import MarketCapResolver from './marketCap.resolver'
import { extractSlug } from './marketCap.resolver'

describe('MarketCapResolver', () => {
  let marketCapResolver: MarketCapResolver
  let mockMarketCapService: Partial<MarketCapService>
  let currentWikiId: string = ''

  beforeEach(async () => {
    currentWikiId = ''
    mockMarketCapService = {
      ranks: jest.fn(async () => [
        {
          id: 'iqcoin',
          name: 'IQ Coin',
          wikiId: currentWikiId,
        },
      ]),

      updateMistachIds: jest.fn(async (args) => {
        currentWikiId = args.wikiId
        return true
      }),

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

    it('should update wikiId and service should return updated value', async () => {
      let result = await marketCapResolver.rankList({
        kind: RankType.TOKEN,
        limit: 1,
        offset: 0,
      })
      expect(result[0].wikiId).toBe('')

      const updateSuccess = await marketCapResolver.linkWikiToRankData({
        coingeckoId: 'iqcoin',
        wikiId: 'new-wiki-id',
        kind: RankType.TOKEN,
      })

      expect(updateSuccess).toBe(true)
      expect(mockMarketCapService.updateMistachIds).toHaveBeenCalledWith({
        coingeckoId: 'iqcoin',
        wikiId: 'new-wiki-id',
        kind: RankType.TOKEN,
      })

      result = await marketCapResolver.rankList({
        kind: RankType.TOKEN,
        limit: 1,
        offset: 0,
      })
      expect(result[0].wikiId).toBe('new-wiki-id')
    })

    it('should handle URL wikiIds by extracting slug', async () => {
      const updateSuccess = await marketCapResolver.linkWikiToRankData({
        coingeckoId: 'iqcoin',
        wikiId: 'https://iqcoin.com/wiki/my-coin/',
        kind: RankType.TOKEN,
      })

      expect(updateSuccess).toBe(true)
      expect(mockMarketCapService.updateMistachIds).toHaveBeenCalledWith({
        coingeckoId: 'iqcoin',
        wikiId: 'my-coin',
        kind: RankType.TOKEN,
      })
    })

    it('should return false for empty wikiId', async () => {
      const updateSuccess = await marketCapResolver.linkWikiToRankData({
        coingeckoId: 'iqcoin',
        wikiId: '',
        kind: RankType.TOKEN,
      })

      expect(updateSuccess).toBe(false)
      expect(mockMarketCapService.updateMistachIds).not.toHaveBeenCalled()
    })

    it('should return false if service update fails', async () => {
      ;(
        mockMarketCapService.updateMistachIds as jest.Mock
      ).mockRejectedValueOnce(new Error('Update failed'))

      const updateSuccess = await marketCapResolver.linkWikiToRankData({
        coingeckoId: 'iqcoin',
        wikiId: 'my-wiki',
        kind: RankType.TOKEN,
      })

      expect(updateSuccess).toBe(false)
    })
  })

  describe('extractSlug', () => {
    it('should extract slug from URL with trailing slash', () => {
      expect(extractSlug('https://iqcoin.com/wiki/bitcoin/')).toBe('bitcoin')
    })

    it('should extract slug from URL without trailing slash', () => {
      expect(extractSlug('https://iqcoin.com/wiki/ethereum')).toBe('ethereum')
    })

    it('should handle URLs with only domain', () => {
      expect(extractSlug('https://iqcoin.com')).toBe('iqcoin.com')
    })

    it('should return the entire string if there are no slashes', () => {
      expect(extractSlug('bitcoin')).toBe('bitcoin')
    })

    it('should handle empty strings', () => {
      expect(extractSlug('')).toBe('')
    })
  })
})
