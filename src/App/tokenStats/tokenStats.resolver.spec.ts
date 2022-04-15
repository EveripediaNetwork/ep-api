import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { getMockRes } from '@jest-mock/express'
import { CacheModule } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import TokenStatsResolver from './tokenStats.resolver'
import TokenStatsService from './tokenStats.service'

describe('tokenStatsResolver', () => {
  let tokenStatsService: TokenStatsService
  let tokenStatsResolver: TokenStatsResolver
  let moduleRef: TestingModule

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule.register({
          timeout: 20000,
          maxRedirects: 5,
        }),
        CacheModule.register({ ttl: 30 }),
      ],
      providers: [TokenStatsResolver, TokenStatsService, ConfigService],
    }).compile()
    tokenStatsResolver = moduleRef.get<TokenStatsResolver>(TokenStatsResolver)
    tokenStatsService = moduleRef.get<TokenStatsService>(TokenStatsService)
  })

  it('should be defined', () => {
    expect(tokenStatsResolver).toBeDefined()
  })

  it('should return an array of one TokenData object', async () => {
    const symbol = 'btc'
    const testData = {
      id: 'everipedia',
      symbol: 'iq',
      market_data: {
        market_cap: {
          usd: 117819864,
        },
        market_cap_change_percentage_24h: 4.1948,
        price_change_percentage_24h: 4.8428,
        fully_diluted_valuation: {
          usd: 246892035,
        },
        total_volume: {
          usd: 7662235,
        },
      },
    }
    const { res } = getMockRes<any>({
      data: { ...testData },
    })
    const result: any = getMockRes({ data: { ...testData } })
    jest.spyOn(tokenStatsService, 'getStats').mockImplementation(() => result)

    expect(await tokenStatsResolver.getTokenStats(symbol)).toHaveProperty(
      'res.data',
    )
    expect(res.data).toHaveProperty('symbol')
  })

  it('should return a not found exception when an invalid token symbol is passed', async () => {
    const testData = {
      errors: [
        {
          message: 'Request failed with status code 404',
        },
      ],
      data: null,
    }
    const { res } = getMockRes<any>({
      ...testData,
    })
    const result: any = getMockRes({ data: { ...testData } })
    jest.spyOn(tokenStatsService, 'getStats').mockImplementation(() => result)

    expect(await tokenStatsResolver.getTokenStats('')).toHaveProperty(
      'res.data',
    )
    expect(res.data).toBe(null)
    expect(res.errors[0].message).toBe('Request failed with status code 404')
  })
})
