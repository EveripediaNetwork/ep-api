import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, QueryBuilder, Repository } from 'typeorm'
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
      expect(tokenValidatorMock).toHaveBeenCalledWith(token, id, false);
    });
    it('should return false when token validator fails', async () => {
      const id = 'a_new_Id';
      const token = 'some_random_token';
      jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(false);
      const result = await wikiSubscriptionService.getSubs(token, id);
      expect(result).toBe(false);
    });
  });

  describe('addSub', () => {
    // it('should return a new subscription', async () => {
    //   const token = 'valid_token';
    //   const args = new WikiSubscriptionArgs();
    //   const newSubscription = new IqSubscription();
    //   jest
    //     .spyOn(TokenValidator.prototype, 'validateToken')
    //     .mockReturnValue(true);
    //   jest
    //     .spyOn(wikiSubscriptionService, 'findSub')
    //     .mockResolvedValue(null);
    //   jest
    //     .spyOn(wikiSubscriptionService, 'repository')
    //     .mockResolvedValue({
    //       create: jest.fn().mockReturnValue(newSubscription),
    //       save: jest.fn(),
    //     });

    //   const result = await wikiSubscriptionService.addSub(token, args);
    //   expect(result).toBe(newSubscription);
    // });

    it('should return false when token validation fails', async () => {
      const token = 'invalid_token';
      const args = new WikiSubscriptionArgs();
      jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(false);
      const result = await wikiSubscriptionService.addSub(token, args);
      expect(result).toBe(false);
    });

    it('should return false when token validation fails', async () => {
      const token = 'invalid_token';
      const id = '101';
      const args = new WikiSubscriptionArgs();
      jest
        .spyOn(TokenValidator.prototype, 'validateToken')
        .mockReturnValue(false);

      const result = await wikiSubscriptionService.removeSub(token, id, args);
      expect(result).toBe(false);
    });
  });
});