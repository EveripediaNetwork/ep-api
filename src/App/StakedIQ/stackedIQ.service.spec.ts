import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { SchedulerRegistry } from '@nestjs/schedule'
import { ethers } from 'ethers'
import { of, throwError } from 'rxjs'
import StakedIQService from './stakedIQ.service'
import StakedIQRepository from './stakedIQ.repository'
import * as stakedIQUtils from './stakedIQ.utils'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'

jest.mock('../Treasury/treasury.dto', () => ({
  firstLevelNodeProcess: jest.fn(),
}))

jest.mock('ethers')
jest.mock('./stakedIQ.utils', () => ({
  existRecord: jest.fn(),
  stopJob: jest.fn(),
  getDates: jest.fn(),
  insertOldData: jest.fn(),
}))

describe('StakedIQService', () => {
  let stackedIQService: StakedIQService
  let configService: ConfigService
  let httpService: HttpService
  let stackedRepository: StakedIQRepository
  let schedulerRegistry: SchedulerRegistry

  const config = {
    HIIQ_ADDRESS: '0xhiiq',
    IQ_ADDRESS: '0xiq',
    etherScanApiKey: 'test-api-key',
    PROVIDER_NETWORK: 'mainnet',
  }

  const repo = {
    saveData: jest.fn(),
    findOne: jest.fn(),
  }

  const mockHttpService = {
    get: jest.fn(),
  }

  const mockSchedulerRegistry = {
    getCronJob: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StakedIQService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => config[key]),
          },
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: StakedIQRepository,
          useValue: repo,
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
      ],
    }).compile()

    stackedIQService = module.get<StakedIQService>(StakedIQService)
    configService = module.get<ConfigService>(ConfigService)
    httpService = module.get<HttpService>(HttpService)
    stackedRepository = module.get<StakedIQRepository>(StakedIQRepository) 
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry)
  })

  describe('storeIQStacked', () => {
    beforeEach(() => {
      ;(firstLevelNodeProcess as jest.Mock).mockReturnValue(true)
    })

    it('should store TVL when no record exists for current date', async () => {
      const TVL = 1000
      jest.spyOn(stackedIQService, 'getTVL').mockResolvedValue(TVL)
      ;(stakedIQUtils.existRecord as jest.Mock).mockResolvedValue(false)

      await stackedIQService.storeIQStacked()

      expect(repo.saveData).toHaveBeenCalledWith(`${TVL}`)
    })

    it('should not store TVL when record exists for current date', async () => {
      const TVL = 1000
      jest.spyOn(stackedIQService, 'getTVL').mockResolvedValue(TVL)
      ;(stakedIQUtils.existRecord as jest.Mock).mockResolvedValue(true)

      await stackedIQService.storeIQStacked()

      expect(repo.saveData).not.toHaveBeenCalled()
    })

    it('should not process if not first level node', async () => {
      ;(firstLevelNodeProcess as jest.Mock).mockReturnValue(false)

      await stackedIQService.storeIQStacked()

      expect(repo.saveData).not.toHaveBeenCalled()
    })
  })

  describe('indexOldStakedBalance', () => {
    const job = { stop: jest.fn() }

    beforeEach(() => {
      mockSchedulerRegistry.getCronJob.mockReturnValue(job)
      ;(firstLevelNodeProcess as jest.Mock).mockReturnValue(true)
      stakedIQUtils.stopJob.mockResolvedValue(false)
    })

    it('should process old data when no record exists', async () => {
      stakedIQUtils.existRecord.mockResolvedValue(false)
      jest.spyOn(stackedIQService, 'previousStakedIQ').mockResolvedValue()

      await stackedIQService.indexOldStakedBalance()

      expect(stakedIQUtils.stopJob).toHaveBeenCalledWith(stackedRepository, job)
      expect(stackedIQService.previousStakedIQ).toHaveBeenCalled()
    })

    it('should not process old data when record exists', async () => {
      stakedIQUtils.existRecord.mockResolvedValue(true)
      jest.spyOn(stackedIQService, 'previousStakedIQ').mockResolvedValue()

      await stackedIQService.indexOldStakedBalance()

      expect(stackedIQService.previousStakedIQ).not.toHaveBeenCalled()
    })
  })

  describe('getTVL', () => {
    const contract = {
      balanceOf: jest.fn(),
    }

    beforeEach(() => {
      ;(ethers.providers.JsonRpcProvider as jest.Mock).mockReturnValue({})
      ;(ethers.utils.Interface as jest.Mock).mockReturnValue({})
      ;(ethers.Contract as jest.Mock).mockReturnValue(contract)
      contract.balanceOf.mockReset()
    })

    it('should get current TVL when no block specified', async () => {
      contract.balanceOf.mockResolvedValue({
        toString: () => '1000000000000000000',
      })

      const result = await stackedIQService.getTVL()

      expect(result).toBe(1)
      expect(contract.balanceOf).toHaveBeenCalledWith(
        config.HIIQ_ADDRESS,
      )
    })

    it('should get TVL for specific block when specified', async () => {
      contract.balanceOf.mockResolvedValue({
        toString: () => '1000000000000000000',
      });
      const blockNumber = '12345';

      const result = await stackedIQService.getTVL(blockNumber);

      expect(result).toBe(1);
      expect(contract.balanceOf).toHaveBeenCalledWith(
        config.HIIQ_ADDRESS,
        { blockTag: Number(blockNumber) }
      )
    })

    it('should handle contract errors gracefully', async () => {
      contract.balanceOf.mockRejectedValue(new Error('Contract error'))

      await expect(stackedIQService.getTVL()).rejects.toThrow('Contract error')
    })
  })

  describe('previousStakedIQ', () => {
    const date = new Date('2024-01-01')

    beforeEach(() => {
      jest.clearAllMocks()
      stakedIQUtils.getDates.mockResolvedValue({
        time: '1234567890',
        incomingDate: date,
      })
      jest.spyOn(stackedIQService, 'getTVL').mockReset()
    })

    it('should process previous staked IQ successfully', async () => {
      const response = { data: { result: '12345' } }
      mockHttpService.get.mockReturnValue(of(response))
      jest.spyOn(stackedIQService, 'getTVL').mockResolvedValue(100)

      await stackedIQService.previousStakedIQ()

      expect(stakedIQUtils.insertOldData).toHaveBeenCalledWith(
        100,
        expect.any(Date),
        stackedRepository,
      )
    })

    it('should handle goerli network URL', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'PROVIDER_NETWORK') return 'goerli'
        return config[key]
      })

      const response = { data: { result: '12345' } }
      mockHttpService.get.mockReturnValue(of(response))
      jest.spyOn(stackedIQService, 'getTVL').mockResolvedValue(100)

      await stackedIQService.previousStakedIQ()

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('api-goerli.etherscan.io'),
      )
    })

    it('should handle getDates errors', async () => {
      (stakedIQUtils.getDates as jest.Mock).mockRejectedValue(new Error('Dates error'));

      await expect(stackedIQService.previousStakedIQ()).rejects.toThrow('Dates error');
    });

  })
})
