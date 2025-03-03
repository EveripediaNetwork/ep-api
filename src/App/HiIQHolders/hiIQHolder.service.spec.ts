import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { SchedulerRegistry } from '@nestjs/schedule'
import { of, throwError } from 'rxjs'
import HiIQHolderService from './hiIQHolder.service'
import HiIQHolderAddressRepository from './hiIQHolderAddress.repository'
import HiIQHolderRepository from './hiIQHolder.repository'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import { Direction, IntervalByDays, OrderBy } from '../general.args'

jest.mock('../Treasury/treasury.dto', () => ({
  firstLevelNodeProcess: jest.fn(),
}))

jest.mock('../StakedIQ/stakedIQ.utils', () => ({
  stopJob: jest.fn(),
}))

describe('HiIQHolderService', () => {
  let hiIQHolderService: HiIQHolderService
  let hiIQHoldersRepo: HiIQHolderRepository
  let hiIQHoldersAddressRepo: HiIQHolderAddressRepository
  let schedulerRegistry: SchedulerRegistry
  let httpService: HttpService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HiIQHolderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'PROVIDER_NETWORK':
                  return 'mainnet'
                case 'etherScanApiKey':
                  return 'test-api-key'
                default:
                  return null
              }
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn().mockReturnValue(
              of({
                data: {
                  result: [
                    {
                      data: '0x...',
                      topics: ['0x...'],
                      blockNumber: '123',
                    },
                  ],
                },
              }),
            ),
          },
        },
        {
          provide: HiIQHolderRepository,
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            query: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        {
          provide: HiIQHolderAddressRepository,
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              delete: jest.fn().mockReturnThis(),
              from: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({}),
              getCount: jest.fn().mockResolvedValue(10),
            }),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            getCronJob: jest.fn(),
          },
        },
      ],
    }).compile()

    hiIQHolderService = module.get<HiIQHolderService>(HiIQHolderService)
    hiIQHoldersRepo = module.get<HiIQHolderRepository>(HiIQHolderRepository)
    hiIQHoldersAddressRepo = module.get<HiIQHolderAddressRepository>(
      HiIQHolderAddressRepository,
    )
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry)
    httpService = module.get<HttpService>(HttpService)
  })

  describe('lastHolderRecord', () => {
    it('should return the last holder record', async () => {
      const record = [
        {
          id: 1,
          amount: 100,
          created: new Date(),
          updated: new Date(),
          tokens: '100',
          day: new Date(),
        },
      ]
      jest.spyOn(hiIQHoldersRepo, 'find').mockResolvedValue(record)

      const result = await hiIQHolderService.lastHolderRecord()
      expect(result).toEqual(record)
      expect(hiIQHoldersRepo.find).toHaveBeenCalledWith({
        order: { updated: 'DESC' },
        take: 1,
      })
    })
  })

  describe('checkExistingHolders', () => {
    it('should return existing holder address', async () => {
      const address = '0x123'
      const holder = {
        id: 1,
        address,
        tokens: '100',
        created: new Date(),
        updated: new Date(),
      }
      jest.spyOn(hiIQHoldersAddressRepo, 'findOneBy').mockResolvedValue(holder)

      const result = await hiIQHolderService.checkExistingHolders(address)
      expect(result).toEqual(holder)
      expect(hiIQHoldersAddressRepo.findOneBy).toHaveBeenCalledWith({
        address,
      })
    })

    it('should return null when no holder exists', async () => {
      jest.spyOn(hiIQHoldersAddressRepo, 'findOneBy').mockResolvedValue(null)

      const result = await hiIQHolderService.checkExistingHolders('0x999')
      expect(result).toBeNull()
      expect(hiIQHoldersAddressRepo.findOneBy).toHaveBeenCalledWith({
        address: '0x999',
      })
    })
  })

  describe('getOldLogs', () => {
    it('should fetch logs successfully', async () => {
      const logs = [{ data: '0x...', topics: ['0x...'] }]
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
          data: { result: logs },
        }),
      )

      const result = await hiIQHolderService.getOldLogs()
      expect(result).toEqual(logs)
    })

    it('should handle errors when fetching logs', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('Network error')))

      const result = await hiIQHolderService.getOldLogs()
      expect(result).toBeUndefined()
    })

    it('should handle block number request errors', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('Block number error')))

      const result = await hiIQHolderService.getOldLogs()
      expect(result).toBeUndefined()
    })

    it('should handle logs request errors', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(
          of({
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
            data: { result: '100' },
          }),
        )
        .mockReturnValueOnce(
          of({
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
            data: { result: '200' },
          }),
        )
        .mockReturnValue(throwError(() => new Error('Logs request error')))

      const result = await hiIQHolderService.getOldLogs()
      expect(result).toBeUndefined()
    })
  })

  describe('hiIQHoldersRank', () => {
    it('should return ranked holders', async () => {
      const rankedHolders = [
        { address: '0x123', tokens: '1000' },
        { address: '0x456', tokens: '500' },
      ]
      jest.spyOn(hiIQHoldersAddressRepo, 'createQueryBuilder').mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rankedHolders),
      } as any)

      const result = await hiIQHolderService.hiIQHoldersRank({
        direction: 'DESC' as Direction,
        offset: 0,
        limit: 10,
        order: { tokens: 'DESC' } as unknown as OrderBy,
      })
      expect(result).toEqual(rankedHolders)
    })

    it('should handle error in query builder', async () => {
      jest.spyOn(hiIQHoldersAddressRepo, 'createQueryBuilder').mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Ranking query error')),
      } as any)

      await expect(
        hiIQHolderService.hiIQHoldersRank({
          direction: 'DESC' as Direction,
          offset: 0,
          limit: 10,
          order: { tokens: 'DESC' } as unknown as OrderBy,
        }),
      ).rejects.toThrow('Ranking query error')
    })
  })

  describe('getHiIQHoldersGraph', () => {
    it('should return holders graph data for day interval', async () => {
      const holders = [
        { amount: 100, day: new Date() },
        { amount: 200, day: new Date() },
      ]
      jest.spyOn(hiIQHoldersRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(holders),
      } as any)

      const result = await hiIQHolderService.getHiIQHoldersGraph({
        interval: 1,
        offset: 0,
        limit: 10,
      })
      expect(result).toEqual(holders)
    })

    it('should return holders graph data for non-day interval', async () => {
      const holders = [
        { amount: 100, day: new Date() },
        { amount: 200, day: new Date() },
      ]
      jest.spyOn(hiIQHoldersRepo, 'query').mockResolvedValue(holders)

      const result = await hiIQHolderService.getHiIQHoldersGraph({
        interval: 7,
        offset: 0,
        limit: 10,
      })
      expect(result).toEqual(holders)
    })

    it('should handle non-day interval with error in query', async () => {
      jest
        .spyOn(hiIQHoldersRepo, 'query')
        .mockRejectedValue(new Error('Query error'))

      await expect(
        hiIQHolderService.getHiIQHoldersGraph({
          interval: 7,
          offset: 0,
          limit: 10,
        }),
      ).rejects.toThrow('Query error')
    })

    it('should handle day interval with error in query builder', async () => {
      jest.spyOn(hiIQHoldersRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockRejectedValue(new Error('Query builder error')),
      } as any)

      await expect(
        hiIQHolderService.getHiIQHoldersGraph({
          interval: IntervalByDays.DAY,
          offset: 0,
          limit: 10,
        }),
      ).rejects.toThrow('Query builder error')
    })
  })

  describe('getHiIQHoldersCount', () => {
    it('should return the latest holder count', async () => {
      const count = [{ amount: 500, created: new Date() }]
      jest.spyOn(hiIQHoldersRepo, 'createQueryBuilder').mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(count),
      } as any)

      const result = await hiIQHolderService.getHiIQHoldersCount()
      expect(result).toEqual(count)
    })

    it('should handle error in query builder', async () => {
      jest.spyOn(hiIQHoldersRepo, 'createQueryBuilder').mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Count query error')),
      } as any)

      await expect(hiIQHolderService.getHiIQHoldersCount()).rejects.toThrow(
        'Count query error',
      )
    })
  })
})
