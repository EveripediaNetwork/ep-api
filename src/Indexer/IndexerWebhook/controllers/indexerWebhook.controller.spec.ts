import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { HttpModule } from '@nestjs/axios'
import { HttpStatus, CacheModule } from '@nestjs/common'
import IndexerWebhookController from './indexerWebhook.controller'
import { EventData } from '../indexerWehhook.dto'
import {
  getProviders,
  ProviderEnum,
} from '../../../App/utils/test-helpers/testHelpers'
import AlchemyNotifyService from '../../../ExternalServices/alchemyNotify.service'
import { mockCacheStore } from '../../../App/utils/test-helpers/reuseableTestObjects'

describe('IndexerWebhookController', () => {
  let controller: IndexerWebhookController
  let alchemyNotifyService: AlchemyNotifyService
  let moduleRef: TestingModule
  let req: any
  const failedResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest
      .fn()
      .mockReturnValue({ status: HttpStatus.BAD_REQUEST, indexing: false }),
  }

  const successfulResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnValue({ status: HttpStatus.OK, indexing: true }),
  }

  const value = {
    event: { data: { block: { number: 10, logs: [] } } },
  } as unknown as EventData

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [IndexerWebhookController],
      imports: [
        HttpModule,
        CacheModule.register({
          ttl: 3600,
          store: mockCacheStore,
        }),
      ],
      providers: [
        ...getProviders([
          ProviderEnum.runCommand,
          ProviderEnum.graphProviderService,
          ProviderEnum.ipfsGetterService,
          ProviderEnum.ipfsValidatorService,
          ProviderEnum.dbStoreService,
          ProviderEnum.metadataChangesService,
          ProviderEnum.indexerWebhookService,
          ProviderEnum.revalidatePageService,
          ProviderEnum.autoInjestService,
          ProviderEnum.lockingService,
        ]),
        {
          provide: ConfigService,
          useValue: {
            key: '',
            secret: '',
          },
        },
        {
          provide: DataSource,
          useFactory: () => ({
            findOneBy: jest.fn(() => ''),
          }),
        },
        AlchemyNotifyService,
        {
          provide: ConfigService,
          useValue: '',
        },
      ],
    }).compile()

    controller = moduleRef.get<IndexerWebhookController>(
      IndexerWebhookController,
    )
    alchemyNotifyService =
      moduleRef.get<AlchemyNotifyService>(AlchemyNotifyService)
    req = {
      headers: {
        'x-alchemy-signature': 'validSignature',
      },
    }
  })

  it('should return 400 if the signature is invalid', async () => {
    jest
      .spyOn(alchemyNotifyService, 'isValidSignatureForStringBody')
      .mockResolvedValue(false)
    expect(
      await controller.initiateWikiWebhookEvent(
        req,
        failedResponse as any,
        value,
      ),
    ).toStrictEqual({ status: 400, indexing: false })
  })

  it('should return 200 if the signature is valid', async () => {
    jest
      .spyOn(alchemyNotifyService, 'isValidSignatureForStringBody')
      .mockResolvedValue(true)
    expect(
      await controller.initiateWikiWebhookEvent(
        req,
        successfulResponse as any,
        value,
      ),
    ).toStrictEqual({ status: 200, indexing: true })
  })
})
