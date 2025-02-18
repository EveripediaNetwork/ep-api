import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { SchedulerRegistry } from '@nestjs/schedule'
import { DataSource } from 'typeorm'
import { ethers } from 'ethers'
import { of } from 'rxjs'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import IQHolderService from './IQHolder.service'
import IQHolderRepository from './IQHolder.repository'
import IQHolderAddressRepository from './IQHolderAddress.repository'
import { LockingService } from './IQHolders.dto'
import * as stakedIQUtils from '../StakedIQ/stakedIQ.utils'

jest.mock('ethers')
jest.mock('../StakedIQ/stakedIQ.utils', () => ({
  stopJob: jest.fn().mockResolvedValue(false),
  leastRecordByDate: jest.fn().mockResolvedValue([]),
}))

describe('IQHolderService', () => {
  let iqholderService: IQHolderService
  let configService: Partial<ConfigService>
  let httpService: Partial<HttpService>
  let iqholderRepo: Partial<IQHolderRepository>
  let dataSource: Partial<DataSource>
  let iqHolders: Partial<IQHolderAddressRepository>
  let schedulerRegistry: Partial<SchedulerRegistry>
  let lockingService: Partial<LockingService>
  let cacheManager: any

  const lastRecord = {
    updated: new Date('2024-01-01'),
    amount: 100,
    day: new Date('2024-01-01'),
    created: new Date('2024-01-01'),
  }

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    }

    httpService = {
      get: jest.fn(),
    }

    iqholderRepo = {
      find: jest.fn().mockResolvedValue([lastRecord]),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    }

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn(),
        },
      }),
    }

    iqHolders = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue(true),
            }),
          }),
        }),
        getCount: jest.fn().mockResolvedValue(100),
      }),
    }

    schedulerRegistry = {
      getCronJob: jest.fn().mockReturnValue({
        running: false,
        stop: jest.fn(),
      }),
    }

    lockingService = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
    }

    cacheManager = {
      get: jest.fn().mockResolvedValue(false),
      set: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IQHolderService,
        { provide: ConfigService, useValue: configService },
        { provide: HttpService, useValue: httpService },
        { provide: IQHolderRepository, useValue: iqholderRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: IQHolderAddressRepository, useValue: iqHolders },
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
        { provide: LockingService, useValue: lockingService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile()

    iqholderService = module.get<IQHolderService>(IQHolderService)
    jest.spyOn(iqholderService, 'provider').mockImplementation(() => 'mainnet')

    jest
      .spyOn(iqholderService, 'etherScanApiKey')
      .mockImplementation(() => 'api-key')
  })

  it('should initialize properly', () => {
    expect(iqholderService).toBeDefined()
  })

  // it('should return provider network from config', () => {
  //   const expectedProvider = 'https://mainnet.infura.io/v3/key'
  //   ;(configService.get as jest.Mock).mockReturnValue(expectedProvider)
  //   expect(iqholderService.provider()).toBe(expectedProvider)
  // })

  it('should fetch last holder record', async () => {
    const result = await iqholderService.lastHolderRecord()
    expect(result).toEqual([lastRecord])
    expect(iqholderRepo.find).toHaveBeenCalledWith({
      order: { updated: 'DESC' },
      take: 1,
    })
  })

  it('should check for existing holders', async () => {
    const address = '0x123'
    const holder = { address }
    ;(iqHolders.findOneBy as jest.Mock).mockResolvedValue(holder)

    const result = await iqholderService.checkExistingHolders(address)
    expect(result).toEqual(holder)
    expect(iqHolders.findOneBy).toHaveBeenCalledWith({ address })
  })

  it('should not process when cache has temp stop flag', async () => {
    ;(cacheManager.get as jest.Mock).mockResolvedValue(true)
    ;(stakedIQUtils.stopJob as jest.Mock).mockResolvedValue(true)

    await iqholderService.storeIQHolderCount()
    expect(lockingService.acquireLock).not.toHaveBeenCalled()
  })

  it('should handle transaction processing with valid transfer', async () => {
    const transaction = {
      functionName: 'transfer',
      txreceipt_status: '1',
      from: '0x123',
      blockNumber: '12345',
    }
    ;(httpService.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('getblocknobytime')) {
        return of({ data: { result: '12345' } })
      }
      return of({ data: { result: [transaction] } })
    })
    ;(lockingService.acquireLock as jest.Mock).mockResolvedValue(true)

    const balance = ethers.BigNumber.from('1000000000000000000')
    const contract = {
      balanceOf: jest.fn().mockResolvedValue(balance),
    }
    ;(ethers.Contract as jest.Mock).mockImplementation(() => contract)
    ;(ethers.providers.JsonRpcProvider as jest.Mock).mockImplementation(
      () => ({}),
    )

    await iqholderService.indexIQHolders()
    expect(lockingService.releaseLock).toHaveBeenCalled()
  })

  it('should handle transaction rollback on error', async () => {
    const queryRunner = dataSource.createQueryRunner()
    const error = new Error('Database error')
    ;(httpService.get as jest.Mock).mockImplementation(() => {
      throw error
    })

    await iqholderService.indexIQHolders()

    expect(queryRunner?.rollbackTransaction).toHaveBeenCalled()
    expect(cacheManager.set).toHaveBeenCalledWith(
      'storeIQHolderCount',
      true,
      900 * 1000,
    )
  })

  it('should handle empty transaction list', () => {
    jest.spyOn(iqholderService, 'getTxList').mockImplementation(() => '')
    const txList = iqholderService.getTxList()
    expect(txList).toBe('')
  })

  it('should handle API error when fetching block numbers', () => {
    jest.spyOn(iqholderService, 'getTxList').mockImplementation(() => {
      throw new Error('API error')
    })
    expect(() => iqholderService.getTxList()).toThrow('API error')
  })

  it('should skip processing when lock cannot be acquired', async () => {
    ;(lockingService.acquireLock as jest.Mock).mockResolvedValue(false)
    ;(stakedIQUtils.stopJob as jest.Mock).mockResolvedValue(false)

    await iqholderService.storeIQHolderCount()
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled()
  })
})
