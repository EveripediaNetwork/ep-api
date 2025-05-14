import { DataSource } from 'typeorm'
import { Test, TestingModule } from '@nestjs/testing'

import ActivityRepository from './activity.repository'
import ActivityService from './activity.service'
import Activity from '../../Database/Entities/activity.entity'
import { Count, UserArgs, WikiStats } from '../Wiki/wikiStats.dto'
import { ActivityByCategoryArgs } from './dto/activity.dto'
import { ActivityType } from '../general.args'
import User from '../../Database/Entities/user.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Language from '../../Database/Entities/language.entity'
import { UserActivity } from '../User/user.dto'

describe('ActivityRepository', () => {
  let repository: ActivityRepository
  let moduleRef: TestingModule

  // Helper function to create query builder mock
  const createQueryBuilderMock = () => {
    const mock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    }
    return mock
  }

  // Helper function to create test data
  const createTestActivity = () => {
    const activity = new Activity()
    activity.id = 'test-id'
    activity.wikiId = 'test-wiki-id'
    activity.userAddress = '0x123'

    const mockUser = new User()
    mockUser.id = '0x123'
    mockUser.profile = new UserProfile()
    mockUser.active = true
    mockUser.wikis = []
    mockUser.wikisCreated = { activity: [] } as UserActivity
    mockUser.wikisEdited = { activity: [] } as UserActivity

    const mockWiki = new Wiki()
    mockWiki.id = 'test-wiki-id'
    mockWiki.author = mockUser
    mockWiki.user = mockUser
    mockWiki.block = 0
    mockWiki.categories = []
    mockWiki.content = ''
    mockWiki.created = new Date()
    mockWiki.hidden = false
    mockWiki.images = []
    mockWiki.ipfs = ''
    mockWiki.media = []
    mockWiki.metadata = []
    mockWiki.summary = ''
    mockWiki.tags = []
    mockWiki.title = ''
    mockWiki.transactionHash = ''
    mockWiki.updated = new Date()
    mockWiki.version = 1
    mockWiki.views = 0
    mockWiki.promoted = 0
    mockWiki.language = new Language()
    mockWiki.nullField = async () => {}

    activity.content = [mockWiki]
    return activity
  }

  beforeEach(async () => {
    const dataSource = {
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
  })

  describe('countUserActivity', () => {
    it('should return the count of user activities within the specified interval', async () => {
      const userId = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e'
      const intervalInHours = 24
      const expectedCount = 5

      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: expectedCount })

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.countUserActivity(userId, intervalInHours)

      expect(result).toBe(expectedCount)
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('COUNT(*)')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        `activity.userId = :id AND activity.datetime >= NOW() - INTERVAL '${intervalInHours} HOURS'`,
        { id: userId },
      )
    })
  })

  describe('getActivities', () => {
    it('should return a list of activities based on the provided arguments', async () => {
      const query = `
        query {
          activities(lang: "en", offset: 0, limit: 30) {
            id
            block
            type
            datetime
            ipfs
            updated_timestamp
            created_timestamp
            wikiId
          }
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

      const fixedDate = new Date('2025-05-13T16:31:23.807Z')
      const mockData = [
        {
          id: 'test-id',
          block: 0,
          type: 0,
          datetime: fixedDate,
          ipfs: '',
          updated_timestamp: fixedDate,
          created_timestamp: fixedDate,
          wikiId: 'test-wiki-id',
          userAddress: '0x123',
          a_author: null,
          a_block: 0,
          a_categories: [],
          a_content: '',
          a_created: fixedDate,
          a_images: [],
          a_ipfs: '',
          a_media: [],
          a_metadata: [],
          a_summary: '',
          a_tags: [],
          a_title: '',
          a_transactionHash: '',
          a_updated: fixedDate,
          a_version: 1,
          hidden: false,
        },
      ]

      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getMany.mockResolvedValue(mockData)

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.getActivities(
        { wikiId: 'test-wiki', limit: 10, offset: 0, lang: 'en' },
        query,
        fields,
      )

      expect(result).toEqual([
        {
          ...mockData[0],
          content: [
            {
              id: 'test-wiki-id',
              title: '',
              block: 0,
              summary: '',
              categories: [],
              images: [],
              media: [],
              tags: [],
              metadata: [],
              author: { id: null },
              content: '',
              ipfs: '',
              version: 1,
              transactionHash: '',
              created: fixedDate,
              updated: fixedDate,
              user: { id: '0x123' },
              hidden: false,
            },
          ],
        },
      ])
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
    })
  })

  describe('getActivitiesByWikId', () => {
    it('should return activities by wikiId', async () => {
      const query = `
      query {
        activitiesByWikId(
          lang: "en"
          offset: 0
          limit: 30
          wikiId: "solana-sol"
        ) {
          id
          block
          type
          datetime
          ipfs
          updated_timestamp
          created_timestamp
          wikiId
        }
      }
    `
      const fields = ['field1', 'field2']

      const expectedResult = [new Activity(), new Activity()]

      repository.getActivitiesByWikId = jest
        .fn()
        .mockResolvedValue(expectedResult)

      const result = await repository.getActivitiesByWikId(
        { wikiId: 'solana-sol', limit: 30, offset: 0, lang: 'en' },
        query,
        fields,
      )

      expect(result).toEqual(expectedResult)
      expect(repository.getActivitiesByWikId).toHaveBeenCalledWith(
        { wikiId: 'solana-sol', limit: 30, offset: 0, lang: 'en' },
        query,
        fields,
      )
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

      const expectedActivities = [createTestActivity(), createTestActivity()]
      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getMany.mockResolvedValue(expectedActivities)

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.getActivitiesByCategory(categoryArgs)

      expect(result).toEqual(expectedActivities)
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki_categories_category',
        'c',
        'c."categoryId" = :categoryId',
        { categoryId: categoryArgs.category },
      )
    })
  })

  describe('getActivitiesByUser', () => {
    it('should return activities by user', async () => {
      const userArgs = {
        userId: '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
        offset: 0,
        limit: 10,
      }

      const expectedActivities = [createTestActivity(), createTestActivity()]
      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getMany.mockResolvedValue(expectedActivities)

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.getActivitiesByUser(userArgs.userId)

      expect(result).toEqual(expectedActivities)
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'activity.user',
        'user',
      )
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'activity.userAddress = :userAddress',
        { userAddress: userArgs.userId },
      )
    })
  })

  describe('getActivitiesById', () => {
    it('should return activity by ID', async () => {
      const id = 'example-wiki-id'
      const expectedActivity = new Activity()

      repository.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(expectedActivity),
      })

      const result = await repository.getActivitiesById(id)

      expect(result).toEqual(expectedActivity)
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('activity')
      expect(repository.createQueryBuilder().leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(repository.createQueryBuilder().where).toHaveBeenCalledWith(
        'activity.id = :id AND w."hidden" = false',
        { id },
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

      const expectedActivity = createTestActivity()
      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getOne.mockResolvedValue(expectedActivity)

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.getActivitiesByWikiIdAndBlock(blockArgs)

      expect(result).toEqual(expectedActivity)
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'activity.wikiId = :wikiId AND w."hidden" = false',
        { wikiId: blockArgs.wikiId },
      )
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.language = :lang AND activity.block = :block ',
        { lang: blockArgs.lang, block: blockArgs.block },
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
      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getRawMany.mockResolvedValue(expectedWikiStats)

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.queryWikisByActivityType(
        intervalArgs,
        type,
      )

      expect(result).toEqual(expectedWikiStats)
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('Count(*)', 'amount')
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'Min(datetime)',
        'startOn',
      )
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'Max(datetime)',
        'endOn',
      )
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'date_trunc(:t, datetime) AS interval',
      )
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith({
        start: intervalArgs.startDate,
        end: intervalArgs.endDate,
        t: intervalArgs.interval,
        events: 'events',
        type,
      })
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('interval')
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'Min(datetime)',
        'ASC',
      )
    })
  })

  describe('getWikisCreatedByUser', () => {
    it('should return wikis created by a user', async () => {
      const userArgs: UserArgs = {
        userId: '0x',
        startDate: 0,
        endDate: 0,
      }
      const type = 0

      const expectedWikis = new WikiStats()
      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getRawOne.mockResolvedValue(expectedWikis)

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.getWikisCreatedByUser(userArgs)

      expect(result).toEqual(expectedWikis)
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'activity.userId',
        'address',
      )
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'Count(*) FILTER(WHERE activity.datetime >= to_timestamp(:start) AND activity.datetime <= to_timestamp(:end))',
        'amount',
      )
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith({
        id: userArgs.userId.toLowerCase(),
        start: userArgs.startDate,
        end: userArgs.endDate,
        type,
      })
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('activity.userId')
    })
  })

  describe('getEditorCount', () => {
    it('should return count of active editors', async () => {
      const dateArgs = {
        startDate: 0,
        endDate: 0,
      }

      const expectedCount = new Count()
      const mockQueryBuilder = createQueryBuilderMock()
      mockQueryBuilder.getRawOne.mockResolvedValue(expectedCount)

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder)

      const result = await repository.getEditorCount(dateArgs)

      expect(result).toEqual(expectedCount)
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        `Count(distinct activity."userId")`,
        'amount',
      )
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'wiki',
        'w',
        'w."id" = activity.wikiId',
      )
      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith({
        start: dateArgs.startDate,
        end: dateArgs.endDate,
      })
    })
  })
})
