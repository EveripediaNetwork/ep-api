import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import WikiSubscriptionResolver from '../../Subscriptions/subscriptions.resolver'
import WikiSubscriptionService from '../../Subscriptions/subscriptions.service'
import TokenValidator from '../validateToken'
import IqSubscription from '../../../Database/Entities/IqSubscription'

describe('WikiSubscription', () => {
  let wikiSubscriptionService: WikiSubscriptionService
  let wikiSubscriptionResolver: WikiSubscriptionResolver
  let dataSource: {
    createEntityManager: jest.Mock
  }

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WikiSubscriptionResolver,
        WikiSubscriptionService,
        TokenValidator,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()
    wikiSubscriptionService = module.get<WikiSubscriptionService>(
      WikiSubscriptionService,
    )
    wikiSubscriptionResolver = module.get<WikiSubscriptionResolver>(
      WikiSubscriptionResolver,
    )
  })
  describe('wikiSubscriptions', () => {
    it('should return an array of IqSubscription', async () => {
      const expectedData: IqSubscription[] = [
        {
          id: '101',
          userId: 'user101',
          subscriptionType: 'type101',
          auxiliaryId: 'auxiliary101',
        },
        {
          id: '202',
          userId: 'user202',
          subscriptionType: 'type202',
          auxiliaryId: 'auxiliary202',
        },
      ]
      jest
        .spyOn(wikiSubscriptionService, 'getSubs')
        .mockResolvedValue(expectedData)
      const context = {
        req: {
          headers: {
            authorization: 'firsttoken',
          },
        },
      }
      const result = await wikiSubscriptionResolver.wikiSubscriptions(
        context,
        'userId',
      )
      expect(result).toEqual(expectedData)
    })
  })
  describe('addWikiSubscription', () => {
    it('should add a new wiki subscription', async () => {
      const expectedData = {
        id: '202',
        userId: 'user202',
        subscriptionType: 'type202',
        auxiliaryId: 'auxiliary202',
      }
      const addSubscriptionMock = jest.spyOn(wikiSubscriptionService, 'addSub')
      addSubscriptionMock.mockResolvedValueOnce(expectedData)
      const context = {
        req: {
          headers: {
            authorization: 'secondtoken',
          },
        },
      }
      const result = wikiSubscriptionResolver.addWikiSubscription(
        context,
        expectedData,
      )
      expect(result).resolves.toEqual(expectedData)
      expect(addSubscriptionMock).toHaveBeenCalledWith(
        'secondtoken',
        expectedData,
      )
    })
  })
  describe('removeWikiSubscription', () => {
    it('should remove existing wiki subscription', async () => {
      const expectedData = {
        id: '303',
        userId: 'user303',
        subscriptionType: 'type303',
        auxiliaryId: 'auxiliary303',
      }
      const removeSubscriptionMock = jest.spyOn(
        wikiSubscriptionService,
        'removeSub',
      )
      removeSubscriptionMock.mockResolvedValueOnce(true)
      const context = {
        req: {
          headers: {
            authorization: 'thirdtoken',
          },
        },
      }
      const result = wikiSubscriptionResolver.removeWikiSubscription(
        context,
        expectedData,
      )
      expect(result).resolves.toBe(true)
      expect(removeSubscriptionMock).toHaveBeenCalledWith(
        'thirdtoken',
        'user303',
        expectedData,
      )
    })
  })
})
