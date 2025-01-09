import { Test, TestingModule } from '@nestjs/testing'
import { Cache } from 'cache-manager'
import { DataSource, SelectQueryBuilder } from 'typeorm'
import { CACHE_MANAGER } from '@nestjs/common'
import PageviewsPerDay from '../../Database/Entities/pageviewsPerPage.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import PageViewsService from './pageViews.service'
import { Direction, OrderBy } from '../general.args'

describe('PageViewsService', () => {
  let pageViewsService: PageViewsService
  let dataSource: DataSource
  let cacheManager: Cache

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageViewsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn(),
              create: jest.fn(),
              save: jest.fn(),
              query: jest.fn(),
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn(),
              }),
            }),
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

    pageViewsService = module.get<PageViewsService>(PageViewsService)
    dataSource = module.get<DataSource>(DataSource)
    cacheManager = module.get<Cache>(CACHE_MANAGER)
  })

  it('should be defined', () => {
    expect(pageViewsService).toBeDefined()
  })

  describe('updateCount', () => {
    it('should return 0 if cached', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({ ip: 'test-ip' })
      const result = await pageViewsService.updateCount('wiki-id', 'test-ip')
      expect(result).toBe(0)
    })

    it('should update wiki views and page views', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(undefined)
      jest
        .spyOn(dataSource.getRepository(Wiki), 'query')
        .mockResolvedValueOnce(undefined)
      jest
        .spyOn(pageViewsService as any, 'updatePageViewPerDay')
        .mockResolvedValueOnce(1)

      const result = await pageViewsService.updateCount('wiki-id', 'test-ip')
      expect(result).toBe(1)
    })

    it('should return 0 on error', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(undefined)
      jest
        .spyOn(dataSource.getRepository(Wiki), 'query')
        .mockImplementationOnce(() => {
          throw new Error('Error')
        })

      const result = await pageViewsService.updateCount('wiki-id', 'test-ip')
      expect(result).toBe(0)
    })
  })

  describe('updatePageViewPerDay', () => {
    it('should create new pageview entry if none exists', async () => {
      const repository = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockReturnValueOnce({ id: 'new-id' }),
        save: jest.fn().mockResolvedValueOnce({ id: 'new-id' }),
      }
      jest
        .spyOn(pageViewsService, 'repository')
        .mockResolvedValue(repository as any)

      const result = await pageViewsService['updatePageViewPerDay']('wiki-id')

      expect(result).toBe(1)
      expect(repository.create).toHaveBeenCalledWith({
        wikiId: 'wiki-id',
        day: expect.any(Date),
        visits: 1,
      })
      expect(repository.save).toHaveBeenCalled()
    })

    it('should update existing pageview entry', async () => {
      const repository = {
        findOne: jest.fn().mockResolvedValueOnce({ id: 'existing-id' }),
        query: jest.fn().mockResolvedValueOnce(undefined),
      }
      jest
        .spyOn(pageViewsService, 'repository')
        .mockResolvedValue(repository as any)

      const result = await pageViewsService['updatePageViewPerDay']('wiki-id')

      expect(result).toBe(1)
      expect(repository.query).toHaveBeenCalledWith(
        'UPDATE pageviews_per_day SET visits = visits + $1 where "wikiId" = $2 AND day = $3',
        [1, 'wiki-id', expect.any(Date)],
      )
    })
  })

  describe('getWikiViews', () => {
    it('should return wiki views with correct query parameters', async () => {
      const mockResult = [
        { day: new Date(), visits: 10 },
        { day: new Date(), visits: 20 },
      ]
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce(mockResult),
      }
      jest
        .spyOn(dataSource.getRepository(PageviewsPerDay), 'createQueryBuilder')
        .mockReturnValue(
          queryBuilder as unknown as SelectQueryBuilder<PageviewsPerDay>,
        )

      const args = {
        days: 7,
        offset: 0,
        order: 'day' as OrderBy,
        direction: 'ASC' as Direction,
        limit: 10,
      }

      const result = await pageViewsService.getWikiViews(args)

      expect(result).toEqual(mockResult)
      expect(queryBuilder.select).toHaveBeenCalledWith('day')
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'Sum(visits)',
        'visits',
      )
      expect(queryBuilder.where).toHaveBeenCalledWith('day >= :start', {
        start: expect.any(Date),
      })
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('day <= :end', {
        end: expect.any(Date),
      })
      expect(queryBuilder.offset).toHaveBeenCalledWith(0)
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('day', 'ASC')
    })

    it('should handle empty results', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      }
      jest
        .spyOn(dataSource.getRepository(PageviewsPerDay), 'createQueryBuilder')
        .mockReturnValue(
          queryBuilder as unknown as SelectQueryBuilder<PageviewsPerDay>,
        )

      const args = {
        days: 7,
        offset: 0,
        order: 'day' as OrderBy,
        direction: 'DESC' as Direction,
        limit: 10,
      }

      const result = await pageViewsService.getWikiViews(args)

      expect(result).toEqual([])
    })

    it('should handle different order directions', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      }
      jest
        .spyOn(dataSource.getRepository(PageviewsPerDay), 'createQueryBuilder')
        .mockReturnValue(
          queryBuilder as unknown as SelectQueryBuilder<PageviewsPerDay>,
        )

      const args = {
        days: 7,
        offset: 0,
        order: 'visits' as OrderBy,
        direction: 'DESC' as Direction,
        limit: 10,
      }

      await pageViewsService.getWikiViews(args)

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('visits', 'DESC')
    })
  })
})
