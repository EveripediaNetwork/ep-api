import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { HttpModule } from '@nestjs/axios'
import { CacheModule, HttpStatus } from '@nestjs/common'
import { User } from '@sentry/types'
import Language from '~/../src/Database/Entities/language.entity'
import { RevalidatePageService } from '../../../App/revalidatePage/revalidatePage.service'
import IndexerWebhookService from '../services/indexerWebhook.service'
import IndexerWebhookController from './indexerWebhook.controller'
import RunCommand from '../../run.command'
import GraphProviderService from '../../Provider/graph.service'
import IPFSGetterService from '../../IPFSGetter/ipfs-getter.service'
import IPFSValidatorService from '../../Validator/validator.service'
import DBStoreService from '../../Store/store.service'
import MetadataChangesService from '../../Store/metadataChanges.service'
import { EventData } from '../indexerWehhook.dto'

const mockCacheStore = {
  get: jest.fn(),
  set: jest.fn(),
}

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
  const result = {
    version: 1,
    promoted: 4,
    id: 'right-of-way',
    title: 'Right of way',
    hidden: false,
    block: 29053433,
    transactionHash:
      '0xbbd32825a412139494cb2c641e60c2d1b7d1dd0a0f9706d2b7b73e8050281d94',
    ipfs: 'QmWz3aaBqMvPfas3uqMyWdyARRFE9exc3tRQTr2raFjDfg',
    views: 2,
    content:
      'Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black **Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black** Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black ..you sha have to make it work somehow',
    summary: 'right of way',
    metadata: [
      {
        id: 'coingecko_profile',
        value: 'https://www.coingecko.com/en/nft/otherdeed-for-otherside',
      },
      {
        id: 'previous_cid',
        value: 'QmemMd7TaNiP2wNgBEEn2Z5aLqfxHkhv5j2X6BwnKYqhH6',
      },
      { id: 'words-changed', value: '2' },
      { id: 'percent-changed', value: '0.19' },
      { id: 'blocks-changed', value: 'content, tags' },
      { id: 'wiki-score', value: '19' },
    ],
    media: [],
    linkedWikis: { founders: [], blockchains: [] },
    images: [
      {
        id: 'QmRN6gvCn4bWSS4QZjBJGQrsBiBisJvNyvjjpWLdKu6e8Q',
        type: 'image/jpeg, image/png',
      },
    ],
    created: new Date(),
    updated: new Date(),
    language: 'en' as unknown as Language,
    user: {
      id: '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
    } as unknown as User,
    tags: [],
    categories: [
      {
        id: 'dapps',
      },
    ],
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
        RunCommand,
        GraphProviderService,
        IPFSGetterService,
        IPFSValidatorService,
        DBStoreService,
        MetadataChangesService,
        RevalidatePageService,
        IndexerWebhookService,
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
