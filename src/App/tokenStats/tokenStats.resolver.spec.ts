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
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      image:
        'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1547033579',
      current_price: 13.168431,
      market_cap: 250557097,
      market_cap_rank: 1,
      fully_diluted_valuation: 276777756,
      total_volume: 8178482,
      high_24h: 13.283563,
      low_24h: 13.101506,
      price_change_24h: -0.091509271981,
      price_change_percentage_24h: -0.69012,
      market_cap_change_24h: -1668257.974445641,
      market_cap_change_percentage_24h: -0.66142,
      circulating_supply: 19010556,
      total_supply: 21000000,
      max_supply: 21000000,
      ath: 624.203,
      ath_change_percentage: -97.89128,
      ath_date: '2015-10-20T00:00:00.000Z',
      atl: 6.779735,
      atl_change_percentage: 94.14784,
      atl_date: '2017-06-12T00:00:00.000Z',
      roi: null,
      last_updated: '2022-04-13T12:11:33.045Z',
    }
    const { res } = getMockRes<any>({
      data: { ...testData },
    })
    const result: any = getMockRes({ data: { ...testData } })
    jest.spyOn(tokenStatsService, 'getToken').mockImplementation(() => result)

    expect(await tokenStatsResolver.getTokenStats(symbol)).toHaveProperty(
      'res.data',
    )
    expect(res.data).toHaveProperty('symbol')
  })

  it('should return a not found exception when an invalid token symbol is passed', async () => {
    const testData = {
      errors: [
        {
          message: 'Not Found',
          extensions: {
            code: '404',
            response: {
              statusCode: 404,
              message: 'Not Found',
            },
          },
        },
      ],
      data: null,
    }
    const { res } = getMockRes<any>({
      ...testData,
    })
    const result: any = getMockRes({ data: { ...testData } })
    jest.spyOn(tokenStatsService, 'getToken').mockImplementation(() => result)

    expect(await tokenStatsResolver.getTokenStats('')).toHaveProperty(
      'res.data',
    )
    expect(res.data).toBe(null)
    expect(res.errors[0].message).toBe('Not Found')
  })
})
