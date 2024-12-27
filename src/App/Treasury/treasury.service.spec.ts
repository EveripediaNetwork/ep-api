import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { of, throwError } from 'rxjs'
import { AxiosResponse } from 'axios'
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreasuryService,
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
      const treasuryAddress = 'test-treasury-address'
      const debankKey = 'test-debank-key'

      configService.get
        .mockReturnValueOnce(debankKey)
        .mockReturnValueOnce(treasuryAddress)

      const response: Partial<AxiosResponse> = {
        data: { total_usd_value: 1000.5 },
      }

      httpService.get.mockReturnValue(of(response) as any)
      httpService.get().toPromise = jest.fn().mockResolvedValue(response)

      const result = await treasuryService.requestTotalbalance()

      expect(result).toBe(1000.5)
      expect(httpService.get).toHaveBeenCalledWith(
        `https://pro-openapi.debank.com/v1/user/total_balance?id=${treasuryAddress}`,
        {
          headers: {
            Accesskey: debankKey,
          },
        },
      )
    })

    it('should return null when API call fails', async () => {
      configService.get
        .mockReturnValueOnce('test-debank-key')
        .mockReturnValueOnce('test-treasury-address')

      const error = new Error('API Error')
      httpService.get.mockReturnValue(throwError(() => error))
      httpService.get().toPromise = jest.fn().mockRejectedValue(error)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await treasuryService.requestTotalbalance()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(error)

      consoleSpy.mockRestore()
    })
  })

  describe('storeTotalValue', () => {
    it('should save total value when first level node process', async () => {
      const totalValue = 1000.5

      jest.spyOn(treasuryDto, 'firstLevelNodeProcess').mockReturnValue(true)

      jest
        .spyOn(treasuryService, 'requestTotalbalance')
        .mockResolvedValue(totalValue)

      await treasuryService.storeTotalValue()

      expect(treasuryRepository.saveData).toHaveBeenCalledWith(
        totalValue.toFixed(1),
      )
    })

    it('should not save value when not first level node process', async () => {
      jest.spyOn(treasuryDto, 'firstLevelNodeProcess').mockReturnValue(false)

      await treasuryService.storeTotalValue()

      expect(treasuryRepository.saveData).not.toHaveBeenCalled()
    })
  })
})
