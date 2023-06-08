import { DataSource } from 'typeorm'
import { Test, TestingModule } from '@nestjs/testing'

import ActivityRepository from './activity.repository'
import ActivityService from './activity.service'
import Activity from '../../Database/Entities/activity.entity'
import { ActivityByCategoryArgs } from './dto/activity.dto'
import { expectedQuery, selections } from './activity.service.spec'
import { Count, UserArgs, WikiStats } from '../Wiki/wikiStats.dto'

describe('CategoryService', () => {
  let repository: ActivityRepository
  let service: ActivityService
  let moduleRef: TestingModule

  const createQueryBuilder = jest.fn().mockReturnThis()
  const select = jest.fn().mockReturnThis()
  const addSelect = jest.fn().mockReturnThis()
  const leftJoin = jest.fn().mockReturnThis()
  const leftJoinAndSelect = jest.fn().mockReturnThis()
  const where = jest.fn().mockReturnThis()
  const andWhere = jest.fn().mockReturnThis()
  const cache = jest.fn().mockReturnThis()
  const limit = jest.fn().mockReturnThis()
  const offset = jest.fn().mockReturnThis()
  const orderBy = jest.fn().mockReturnThis()
  const groupBy = jest.fn().mockReturnThis()
  const setParameters = jest.fn().mockReturnThis()
  //   const getOne = jest.fn().mockResolvedValue({})
  //   const query = jest.fn().mockResolvedValue({})
  //   const getRawOne = jest.fn().mockResolvedValue({})
//   const getRawMany = jest.fn().mockResolvedValue([])
  let getMany = jest.fn().mockResolvedValue([])

  const args = {
    wikiId: 'example-wiki-id',
    limit: 10,
    offset: 0,
    lang: 'en',
  }

  const expectedActivities = [new Activity()]

  let dataSource: {
    createEntityManager: jest.Mock
  }
  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }
    moduleRef = await Test.createTestingModule({
      providers: [
        ActivityService,
        ActivityRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()

    repository = moduleRef.get<ActivityRepository>(ActivityRepository)
    service = moduleRef.get<ActivityService>(ActivityService)
  })

  describe('countUserActivity', () => {
    it('should return the count of user activities within the specified interval', async () => {
      const userId = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e'
      const intervalInHours = 24
      const expectedResult = 5

      const createQueryBuilderMock = jest.fn().mockReturnThis()
      const selectMock = jest.fn().mockReturnThis()
      const whereMock = jest.fn().mockReturnThis()
      const getRawOneMock = jest
        .fn()
        .mockResolvedValue({ count: expectedResult })

      repository.createQueryBuilder = createQueryBuilderMock
      createQueryBuilderMock.mockReturnValueOnce({
        select: selectMock,
        where: whereMock,
        getRawOne: getRawOneMock,
      })

      const result = await repository.countUserActivity(userId, intervalInHours)

      expect(result).toBe(expectedResult)

      expect(createQueryBuilderMock).toHaveBeenCalledWith('activity')
      expect(selectMock).toHaveBeenCalledWith('COUNT(*)')
      expect(whereMock).toHaveBeenCalledWith(
        `activity.userId = :id AND activity.datetime >= NOW() - INTERVAL '${intervalInHours} HOURS'`,
        {
          id: userId,
        },
      )
      expect(getRawOneMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('getActivities', () => {
    it('should return a list of activities based on the provided arguments', async () => {
      getMany = jest.fn().mockResolvedValue(expectedActivities)

      repository.createQueryBuilder = createQueryBuilder
      createQueryBuilder.mockReturnValueOnce({
        leftJoin,
        leftJoinAndSelect,
        where,
        cache,
        limit,
        offset,
        orderBy,
        getMany,
      })

      const result = await repository.getActivities(args)

      expect(result).toEqual(expectedActivities)

      expect(createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(leftJoinAndSelect).toHaveBeenCalledWith('activity.user', 'user')
      expect(where).toHaveBeenCalledWith(
        'activity.language = :lang AND w."hidden" = false',
        { lang: args.lang },
      )
      expect(cache).toHaveBeenCalledWith(
        `activities_cache_limit${args.limit}-offset${args.offset}-lang${args.lang}`,
        60000,
      )
      expect(limit).toHaveBeenCalledWith(args.limit)
      expect(offset).toHaveBeenCalledWith(args.offset)
      expect(orderBy).toHaveBeenCalledWith('datetime', 'DESC')
      expect(getMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('getActivitiesByWikId', () => {
    it('should return activities by wikiId', async () => {
      repository.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoin,
        where,
        limit,
        offset,
        orderBy,
        getMany: jest.fn().mockResolvedValue(expectedActivities),
      })
      const result = await repository.getActivitiesByWikId(args)

      expect(result).toEqual(expectedActivities)

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(repository.createQueryBuilder().leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(where).toHaveBeenCalledWith(
        'activity.wikiId = :wikiId AND w."hidden" = false',
        { wikiId: args.wikiId },
      )
      expect(limit).toHaveBeenCalledWith(args.limit)
      expect(offset).toHaveBeenCalledWith(args.offset)
      expect(orderBy).toHaveBeenCalledWith('datetime', 'DESC')
      expect(getMany).toHaveBeenCalled()
    })
  })

  describe('getActivitiesByCategory', () => {
    it('should return activities by wikiId', async () => {
      const categoryAargs = {
        catetory: 'cryptocurrencies',
      } as unknown as ActivityByCategoryArgs

      repository.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoin,
        where,
        limit,
        offset,
        orderBy,
        getMany: jest.fn().mockResolvedValue(expectedActivities),
      })

      const result = await repository.getActivitiesByCategory(categoryAargs)

      expect(result).toEqual(expectedActivities)

      expect(createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki_categories_category',
        'c',
        'c."categoryId" = :categoryId',
        { categoryId: categoryAargs.category },
      )
      expect(limit).toHaveBeenCalledWith(args.limit)
      expect(offset).toHaveBeenCalledWith(args.offset)
      expect(orderBy).toHaveBeenCalledWith('datetime', 'DESC')
      expect(getMany).toHaveBeenCalled()
    })
  })

  describe('getActivitiesByUser', () => {
    it('should return activities by user', async () => {
      const userArgs = {
        userId: 'example-user-id',
        offset: 0,
        limit: 10,
      }

      jest.spyOn(service, 'createCustomQuery').mockResolvedValue(expectedQuery)
      await service.createCustomQuery(
        selections,
        userArgs.userId,
        userArgs.offset,
        userArgs.limit,
      )

      repository.query = jest.fn().mockResolvedValue(expectedActivities)

      const result = await repository.getActivitiesByUser(userArgs, selections)

      expect(result).toEqual(expectedActivities)
      expect(service.createCustomQuery).toHaveBeenCalledWith(
        selections,
        userArgs.userId,
        userArgs.offset,
        userArgs.limit,
      )
      expect(repository.query).toHaveBeenCalledWith(expectedQuery)
    })
  })

  describe('getActivitiesById', () => {
    it('should return activity by ID', async () => {
      const id = 'example-activity-id'
      const expectedActivity = new Activity()
      repository.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(expectedActivity),
      })
      const result = await repository.getActivitiesById(id)
      expect(result).toEqual(expectedActivity)
      expect(createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
    })
  })

  describe('getActivitiesByWikiIdAndBlock', () => {
    it('should return activity by Wiki ID and block', async () => {
      const blockArgs = {
        wikiId: 'example-wiki-id',
        lang: 'en',
        block: 102102,
        offset: 0,
        limit: 0,
      }

      const expectedActivity = new Activity()
      repository.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoin,
        where,
        andWhere,
        getOne: jest.fn().mockResolvedValue(expectedActivity),
      })

      const result = await repository.getActivitiesByWikiIdAndBlock(blockArgs)

      expect(result).toEqual(expectedActivity)

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(where).toHaveBeenCalledWith(
        'activity.wikiId = :wikiId AND w."hidden" = false',
        { wikiId: args.wikiId },
      )
      expect(andWhere).toHaveBeenCalledWith(
        'activity.language = :lang AND activity.block = :block ',
        { lang: args.lang, block: blockArgs.block },
      )
    })
  })

  describe('queryWikisByActivityType', () => {
    it('should return wiki stats by activity type', async () => {
      const intervalArgs = {
        startDate: 1,
        endDate: 1,
        interval: 'hour',
      }
      const type = 0

      const expectedWikiStats = [new WikiStats()]
      repository.createQueryBuilder = jest.fn().mockReturnValue({
        select,
        addSelect,
        leftJoin,
        where,
        andWhere,
        setParameters,
        groupBy,
        orderBy,
        getRawMany: jest.fn().mockResolvedValue(expectedWikiStats),
      })
      const result = await repository.queryWikisByActivityType(intervalArgs, type)

      expect(result).toEqual(expectedWikiStats)

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(select).toHaveBeenCalledWith('Count(*)', 'amount')
      expect(addSelect).toHaveBeenCalledWith('Min(datetime)', 'startOn')
      expect(addSelect).toHaveBeenCalledWith('Max(datetime)', 'endOn')
      expect(addSelect).toHaveBeenCalledWith(
        'date_trunc(:t, datetime) AS interval',
      )
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(setParameters).toHaveBeenCalledWith({
        start: intervalArgs.startDate,
        end: intervalArgs.endDate,
        t: intervalArgs.interval,
        type,
      })
      expect(groupBy).toHaveBeenCalledWith('interval')
      expect(orderBy).toHaveBeenCalledWith('Min(datetime)', 'ASC')
    })
  })

  describe('getWikisCreatedByUser', () => {
    it('should return wikis created by a a user', async () => {
      const userArgs: UserArgs = {
          userId: '0x',
          startDate: 0,
          endDate: 0
      }
      const type = 0

      const expectedWikis = new WikiStats()
      repository.createQueryBuilder = jest.fn().mockReturnValue({
        select,
        addSelect,
        leftJoin,
        where,
        setParameters,
        groupBy,
        getRawOne: jest.fn().mockResolvedValue(expectedWikis),
      })
      const result = await repository.getWikisCreatedByUser(userArgs)

      expect(result).toEqual(expectedWikis)

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(select).toHaveBeenCalledWith('Count(*)', 'amount')
      expect(addSelect).toHaveBeenCalledWith(
        'Count(*) FILTER(WHERE activity.datetime >= to_timestamp(:start) AND activity.datetime <= to_timestamp(:end))',
        'amount',
      )
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(setParameters).toHaveBeenCalledWith({
        id: userArgs.userId.toLowerCase(),
        start: userArgs.startDate,
        end: userArgs.endDate,
        type,
      })
      expect(groupBy).toHaveBeenCalledWith('activity.userId')
      expect(orderBy).toHaveBeenCalledWith('Min(datetime)', 'ASC')
    })
  })

  describe('getEditorCount', () => {
    it('should return of active editors', async () => {
      const dateArgs = {
          startDate: 0,
          endDate: 0
      }

      const expectedCount = new Count()
      repository.createQueryBuilder = jest.fn().mockReturnValue({
        select,
        leftJoin,
        where,
        andWhere,
        setParameters,
        getRawOne: jest.fn().mockResolvedValue(expectedCount),
      })
      const result = await repository.getEditorCount(dateArgs)

      expect(result).toEqual(expectedCount)

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(select).toHaveBeenCalledWith(
        `Count(distinct activity."userId")`,
        'amount',
      )
      expect(leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(setParameters).toHaveBeenCalledWith({
        start: dateArgs.startDate,
        end: dateArgs.endDate,
      })
    })
  })
})
