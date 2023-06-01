import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { HttpModule } from '@nestjs/axios'
import { CacheModule, HttpStatus } from '@nestjs/common'
import IndexerWebhookService from '../services/indexerWebhook.service'
import IndexerWebhookController from './indexerWebhook.controller'
import { EventData } from '../indexerWehhook.dto'
import {
  dummyWiki as result,
  mockCacheStore,
} from '../../../App/utils/test-helpers/reuseableTestObjects'
import {
  getProviders,
  ProviderEnum,
} from '../../../App/utils/test-helpers/testHelpers'

describe('IndexerWebhookController', () => {
  let controller: IndexerWebhookController
  let service: IndexerWebhookService
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
            findOneBy: jest.fn(() => result),
          }),
        },
      ],
    }).compile()

    controller = moduleRef.get<IndexerWebhookController>(
      IndexerWebhookController,
    )
    service = moduleRef.get<IndexerWebhookService>(IndexerWebhookService)
    req = {
      headers: {
        'x-alchemy-signature': 'validSignature',
      },
    }
  })

  it('should return 400 if the signature is invalid', async () => {
    jest
      .spyOn(service, 'isValidSignatureForStringBody')
      .mockResolvedValue(false)
    expect(
      await controller.initiateWebhookStore(req, failedResponse as any, value),
    ).toStrictEqual({ status: 400, indexing: false })
  })

  it('should return 200 if the signature is valid', async () => {
    jest.spyOn(service, 'isValidSignatureForStringBody').mockResolvedValue(true)
    expect(
      await controller.initiateWebhookStore(
        req,
        successfulResponse as any,
        value,
      ),
    ).toStrictEqual({ status: 200, indexing: true })
  })
})
