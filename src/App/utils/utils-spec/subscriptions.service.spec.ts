import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import TokenValidator from '../validateToken'
import WikiSubscriptionService from '../../Subscriptions/subscriptions.service'
import IqSubscription from '../../../Database/Entities/IqSubscription'
import { ProviderEnum, getProviders } from '../test-helpers/testHelpers'
import { WikiSubscriptionArgs } from '../../../Database/Entities/types/IWiki'

describe('WikiSubscriptionService', () => {
  let wikiSubscriptionService: WikiSubscriptionService
  let IqSubscriptionRepository: Repository<IqSubscription>
  let dataSource: {
    createEntityManager: jest.Mock
  }
  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }
    IqSubscriptionRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as Repository<IqSubscription>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ...getProviders([
          ProviderEnum.wikiSubscriptionService,
          ProviderEnum.tokenValidator,
        ]),
        {
          provide: getRepositoryToken(IqSubscription),
          useValue: IqSubscriptionRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()

    wikiSubscriptionService = module.get<WikiSubscriptionService>(
      WikiSubscriptionService,
    )
  })

  describe('getSubs', () => {
    it('should return an array of IqSubscription', async () => {
      const expectedData = [new IqSubscription(), new IqSubscription()]
      const id = '101'
      const token = 'a_new_token'
      const mockRepo = jest
        .spyOn(WikiSubscriptionService.prototype, 'repository')
        .mockResolvedValue({
          find: jest.fn().mockResolvedValue(expectedData),
        } as any)
      const tokenValidatorMock = jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(true)
      const result = await wikiSubscriptionService.getSubs(token, id)
      expect(result).toEqual(expectedData)
      expect(mockRepo).toHaveBeenCalledTimes(1)
      expect(tokenValidatorMock).toHaveBeenCalledWith(token, id, false)
    })
    it('should return false when token validator fails', async () => {
      const id = 'a_new_Id'
      const token = 'some_random_token'
      jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(false)
      const result = await wikiSubscriptionService.getSubs(token, id)
      expect(result).toBe(false)
    })
  })

  describe('addSub', () => {
    it('should return a new subscription', async () => {
      const expectedData = {
        userId: 'userId101',
        subscriptionType: 'type101',
        auxiliaryId: 'id101',
      }

      const createMock = jest.fn().mockReturnValue(expectedData)
      const saveMock = jest.fn().mockResolvedValue(expectedData)

      const mockRepo: Repository<IqSubscription> = {
        create: createMock,
        save: saveMock,
      } as unknown as Repository<IqSubscription>

      jest
        .spyOn(wikiSubscriptionService, 'repository')
        .mockResolvedValue(mockRepo)

      const result = await wikiSubscriptionService.addSub('token', expectedData)
      expect(result).toBe(false)
    })

    it('should remove an existing subscription', async () => {
      const token = 'token'
      const id = 'user'
      const expectedData = new WikiSubscriptionArgs()
      expectedData.userId = 'userId202'
      expectedData.subscriptionType = 'type202'
      expectedData.auxiliaryId = 'id101'
      const createQueryBuilderMock = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }

      const mockRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(createQueryBuilderMock),
      }
      jest
        .spyOn(wikiSubscriptionService, 'repository')
        .mockResolvedValue(mockRepo as any)

      const tokenValidatorMock = jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(true)

      const result = await wikiSubscriptionService.removeSub(
        token,
        id,
        expectedData,
      )

      expect(result).toBe(true)
      expect(tokenValidatorMock).toHaveBeenCalledWith(token, id, false)
      expect(createQueryBuilderMock.delete).toHaveBeenCalled()
      expect(createQueryBuilderMock.from).toHaveBeenCalledWith(IqSubscription)
      expect(createQueryBuilderMock.where).toHaveBeenCalledWith(
        'LOWER(userId) = LOWER(:userId)',
        { userId: expectedData.userId },
      )
      expect(createQueryBuilderMock.andWhere).toHaveBeenCalledWith({
        subscriptionType: expectedData.subscriptionType,
        auxiliaryId: expectedData.auxiliaryId,
      })
      expect(createQueryBuilderMock.execute).toHaveBeenCalled()
    })

    it('should return false when token validation fails', async () => {
      const token = 'invalid_token'
      const expectedData = new WikiSubscriptionArgs()
      jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(false)
      const result = await wikiSubscriptionService.addSub(token, expectedData)
      expect(result).toBe(false)
    })

    it('should return false when token validation fails', async () => {
      const token = 'invalid_token'
      const id = '101'
      const expectedData = new WikiSubscriptionArgs()
      jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(false)

      const result = await wikiSubscriptionService.removeSub(
        token,
        id,
        expectedData,
      )
      expect(result).toBe(false)
    })
  })
})
