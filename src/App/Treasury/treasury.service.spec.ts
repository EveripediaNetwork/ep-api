import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { of, throwError } from 'rxjs'
import { AxiosResponse } from 'axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import TreasuryRepository from './treasury.repository'
import * as treasuryDto from './treasury.dto'
import TreasuryService from './treasury.service'

jest.mock('./treasury.repository')
jest.mock('./treasury.dto')

describe('TreasuryService', () => {
  let treasuryService: TreasuryService
  let configService: jest.Mocked<ConfigService>
  let httpService: jest.Mocked<HttpService>
  let treasuryRepository: jest.Mocked<TreasuryRepository>
  let cacheManager: any
  const treasuryAddress = 'test-treasury-address'
  const url = `https://pro-openapi.debank.com/v1/user/total_balance?id=${treasuryAddress}`

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn().mockResolvedValue(1000.5),
      set: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreasuryService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'DEBANK_API_KEY') return 'test-debank-key'
              if (key === 'TREASURY_ADDRESS') return 'test-treasury-address'
              return undefined
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
          provide: TreasuryRepository,
          useValue: {
            saveData: jest.fn(),
            getCurrentTreasuryValue: jest.fn(),
          },
        },
      ],
    }).compile()

    treasuryService = module.get<TreasuryService>(TreasuryService)
    configService = module.get(ConfigService)
    httpService = module.get(HttpService)
    treasuryRepository = module.get(TreasuryRepository)
  })

  describe('getTreasuryENVs', () => {
    it('should return treasury and debank API configurations', () => {
      configService.get.mockReturnValueOnce('test-debank-key')
      configService.get.mockReturnValueOnce('test-treasury-address')

      const envs = (treasuryService as any).getTreasuryENVs()

      expect(envs).toEqual({
        debank: 'test-debank-key',
        treasury: 'test-treasury-address',
      })
    })

    it('should return undefined for missing configurations', () => {
      configService.get.mockReturnValue(undefined)

      const envs = (treasuryService as any).getTreasuryENVs()

      expect(envs).toEqual({
        debank: undefined,
        treasury: undefined,
      })
    })
  })

  describe('requestTotalbalance', () => {
    it('should return total USD value when API call is successful', async () => {
      const debankKey = 'test-debank-key'

      configService.get
        .mockReturnValueOnce(debankKey)
        .mockReturnValueOnce(treasuryAddress)

      const response: Partial<AxiosResponse> = {
        data: { total_usd_value: 1000.5 },
      }

      httpService.get.mockReturnValue(of(response) as any)

      const result = await treasuryService.requestTotalbalance()

      expect(result).toBe(1000.5)
      expect(httpService.get).toHaveBeenCalledWith(url, {
        headers: {
          Accesskey: debankKey,
        },
      })
    })

    it('should return null when API call fails', async () => {
      configService.get
        .mockReturnValueOnce('test-debank-key')
        .mockReturnValueOnce('test-treasury-address')

      const error = new Error('API Error')
      httpService.get.mockReturnValue(throwError(() => error))

      // Mock the logger instead of console
      const loggerSpy = jest
        .spyOn(treasuryService['logger'], 'error')
        .mockImplementation()

      const result = await treasuryService.requestTotalbalance()

      expect(result).toBeNull()
      expect(loggerSpy).toHaveBeenCalledWith(error)

      loggerSpy.mockRestore()
    })
  })

  describe('storeTotalValue', () => {
    it('should save total value when first level node process', async () => {
      const totalValue = 1000.5

      jest.spyOn(treasuryDto, 'firstLevelNodeProcess').mockReturnValue(true)

      // Mock the API_LEVEL environment variable
      const originalEnv = process.env.API_LEVEL
      process.env.API_LEVEL = 'prod'

      // Mock getCurrentTreasuryValue to return null (no existing entry)
      treasuryRepository.getCurrentTreasuryValue.mockResolvedValue(null)

      jest
        .spyOn(treasuryService, 'requestTotalbalance')
        .mockResolvedValue(totalValue)

      await treasuryService.storeTotalValue()

      expect(treasuryRepository.getCurrentTreasuryValue).toHaveBeenCalled()
      expect(treasuryRepository.saveData).toHaveBeenCalledWith(
        totalValue.toString(),
      )

      // Restore original environment variable
      process.env.API_LEVEL = originalEnv
    })

    it('should not save value when current value already exists', async () => {
      const existingValue = { id: 1, totalValue: '1000.5' } as any

      jest.spyOn(treasuryDto, 'firstLevelNodeProcess').mockReturnValue(true)

      // Mock the API_LEVEL environment variable
      const originalEnv = process.env.API_LEVEL
      process.env.API_LEVEL = 'prod'

      treasuryRepository.getCurrentTreasuryValue.mockResolvedValue(
        existingValue,
      )

      await treasuryService.storeTotalValue()

      expect(treasuryRepository.getCurrentTreasuryValue).toHaveBeenCalled()
      expect(treasuryRepository.saveData).not.toHaveBeenCalled()

      // Restore original environment variable
      process.env.API_LEVEL = originalEnv
    })

    it('should not save value when not first level node process', async () => {
      jest.spyOn(treasuryDto, 'firstLevelNodeProcess').mockReturnValue(false)

      await treasuryService.storeTotalValue()

      expect(treasuryRepository.saveData).not.toHaveBeenCalled()
    })

    it('should not save value when API_LEVEL is not prod', async () => {
      jest.spyOn(treasuryDto, 'firstLevelNodeProcess').mockReturnValue(true)

      // Mock the API_LEVEL environment variable to non-prod
      const originalEnv = process.env.API_LEVEL
      process.env.API_LEVEL = 'dev'

      await treasuryService.storeTotalValue()

      expect(treasuryRepository.getCurrentTreasuryValue).not.toHaveBeenCalled()
      expect(treasuryRepository.saveData).not.toHaveBeenCalled()

      // Restore original environment variable
      process.env.API_LEVEL = originalEnv
    })
  })
})
