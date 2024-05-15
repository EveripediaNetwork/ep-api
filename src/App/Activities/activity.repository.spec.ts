import { DataSource } from 'typeorm'
import { Test, TestingModule } from '@nestjs/testing'

import ActivityRepository from './activity.repository'
import ActivityService from './activity.service'
import Activity from '../../Database/Entities/activity.entity'
// import { ActivityByCategoryArgs } from './dto/activity.dto'
// import { expectedQuery, selections } from './activity.service.spec'
import { Count, UserArgs, WikiStats } from '../Wiki/wikiStats.dto'
import { ActivityByCategoryArgs } from './dto/activity.dto'
import { ActivityType } from '../general.args'

describe('CategoryService', () => {
  let repository: ActivityRepository
  //   let service: ActivityService
  let moduleRef: TestingModule

  //   const createQueryBuilder = jest.fn().mockReturnThis()
  const select = jest.fn().mockReturnThis()
  const addSelect = jest.fn().mockReturnThis()
  const leftJoin = jest.fn().mockReturnThis()
  //   const leftJoinAndSelect = jest.fn().mockReturnThis()
  const where = jest.fn().mockReturnThis()
  const andWhere = jest.fn().mockReturnThis()
  //   const cache = jest.fn().mockReturnThis()
  //   const limit = jest.fn().mockReturnThis()
  //   const offset = jest.fn().mockReturnThis()
  const orderBy = jest.fn().mockReturnThis()
  const groupBy = jest.fn().mockReturnThis()
  const setParameters = jest.fn().mockReturnThis()
  //   const getOne = jest.fn().mockResolvedValue({})
  //   const query = jest.fn().mockResolvedValue({})
  //   const getRawOne = jest.fn().mockResolvedValue({})
  //   const getRawMany = jest.fn().mockResolvedValue([])
  //   let getMany = jest.fn().mockResolvedValue([])

  const args = {
    wikiId: 'example-wiki-id',
    limit: 10,
    offset: 0,
    lang: 'en',
  }

  //   const expectedActivities = [new Activity()]

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
    // service = moduleRef.get<ActivityService>(ActivityService)
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
      const query = `
        activities(lang: "en", offset: 0, limit: 30) {
          id
          block
          type
          datetime
          ipfs
          updated_timestamp
          created_timestamp
          wikiId
        }`

      const fields = [
        'id',
        'block',
        'type',
        'datetime',
        'ipfs',
        'updated_timestamp',
        'created_timestamp',
        'wikiId',
      ]

      const expectedResult = [new Activity(), new Activity()]

      repository.getActivities = jest.fn().mockResolvedValue(expectedResult)
      const result = await repository.getActivities(args, query, fields)
      expect(result).toEqual(expectedResult)
      expect(repository.getActivities).toHaveBeenCalledWith(args, query, fields)
    })
  })

  describe('getActivitiesByWikId', () => {
    it('should return activities by wikiId', async () => {
      const expectedResult = [new Activity(), new Activity()]

      repository.getActivitiesByWikId = jest
        .fn()
        .mockResolvedValue(expectedResult)

      const result = await repository.getActivitiesByWikId(args)

      expect(result).toEqual(expectedResult)
      expect(repository.getActivitiesByWikId).toHaveBeenCalledWith(args)
    })
  })
  describe('getActivitiesByCategory', () => {
    it('should return activities by category', async () => {
      const categoryArgs: ActivityByCategoryArgs = {
        category: 'example-category',
        type: ActivityType.CREATED,
        limit: 10,
        offset: 0,
      }
      const expectedResult = [new Activity(), new Activity()]

      repository.getActivitiesByCategory = jest
        .fn()
        .mockResolvedValue(expectedResult)
      const result = await repository.getActivitiesByCategory(categoryArgs)
      expect(result).toEqual(expectedResult)
      expect(repository.getActivitiesByCategory).toHaveBeenCalledWith(
        categoryArgs,
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
      const result = await repository.queryWikisByActivityType(
        intervalArgs,
        type,
      )

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
        endDate: 0,
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
        endDate: 0,
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
