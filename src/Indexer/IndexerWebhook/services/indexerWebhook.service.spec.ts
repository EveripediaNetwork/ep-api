import { HttpModule } from '@nestjs/axios'
import { CacheModule } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TestingModule, Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { PosthogModule } from 'nestjs-posthog'
import IndexerWebhookService from './indexerWebhook.service'
import { BlockData, decodeABI } from '../indexerWehhook.dto'
import {
  dummyWiki as result,
  mockCacheStore,
} from '../../../App/utils/test-helpers/reuseableTestObjects'
import {
  getProviders,
  ProviderEnum,
} from '../../../App/utils/test-helpers/testHelpers'
import AlchemyNotifyService from '../../../ExternalServices/alchemyNotify.service'

describe('IndexerWebhookService', () => {
  let service: IndexerWebhookService
  let alchemyNotifyService: AlchemyNotifyService
  let moduleRef: TestingModule

  const mockQuery = () => ({
    findOneBy: jest.fn().mockReturnValue(result),
  })

  const mockConnection = () => ({
    getRepository: jest.fn().mockImplementation(mockQuery),
  })

  const eventData = {
    logs: [
      {
        transaction: {
          hash: '0x957fbd45bb96857762edae0e8d16d942c03d32264680ccfff360423654ff79d3',
          index: 1,
          block: null,
          from: {
            address: '0x394f45ad04e110de47f1d14a1c264a86607a6a11',
          },
          to: {
            address: '0x94bb4c72252d0ae7a98b2b0483dc4145c0c79059',
          },
          logs: [
            {
              account: {
                address: '0x94bb4c72252d0ae7a98b2b0483dc4145c0c79059',
              },
              data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002e516d6563354d59487a6978565463315637636d73646a475a7063566f4d554e326b734341443663714b4c317a4437000000000000000000000000000000000000',
              topics: [
                '0x0fe877471cb763db81561ce83d01be57b6699361a3febbc7a0cdfb18df66246b',
                '0x0000000000000000000000005456afea3aa035088fe1f9aa36509b320360a89e',
              ],
              index: 2,
            },
            {
              account: {
                address: '0x0000000000000000000000000000000000001010',
              },
              data: '0x000000000000000000000000000000000000000000000000000349c3bed5b7b8000000000000000000000000000000000000000000000000269e3dbe91bb47320000000000000000000000000000000000000000000031cce6c221cadba343b6000000000000000000000000000000000000000000000000269af3fad2e58f7a0000000000000000000000000000000000000000000031cce6c56b8e9a78fb6e',
              topics: [
                '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63',
                '0x0000000000000000000000000000000000000000000000000000000000001010',
                '0x000000000000000000000000394f45ad04e110de47f1d14a1c264a86607a6a11',
                '0x000000000000000000000000be188d6641e8b680743a4815dfa0f6208038960f',
              ],
              index: 3,
            },
          ],
          type: 0,
          status: 1,
        },
      },
    ],
  } as unknown as BlockData

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.register({
          ttl: 3600,
          store: mockCacheStore,
        }),
        PosthogModule.forRootAsync({
          useFactory: () => ({
            apiKey: 'key',
            mock: true,
          }),
        }),
      ],
      providers: [
        ...getProviders([
          ProviderEnum.runCommand,
          ProviderEnum.posHogService,
          ProviderEnum.graphProviderService,
          ProviderEnum.ipfsGetterService,
          ProviderEnum.ipfsValidatorService,
          ProviderEnum.dbStoreService,
          ProviderEnum.metadataChangesService,
          ProviderEnum.indexerWebhookService,
          ProviderEnum.revalidatePageService,
          ProviderEnum.autoInjestService,
          ProviderEnum.lockingService,
          ProviderEnum.rpcProviderService,
          ProviderEnum.appService,
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
          useFactory: mockConnection,
        },
        AlchemyNotifyService,
        {
          provide: ConfigService,
          useValue: '',
        },
      ],
    }).compile()

    service = moduleRef.get<IndexerWebhookService>(IndexerWebhookService)
    alchemyNotifyService =
      moduleRef.get<AlchemyNotifyService>(AlchemyNotifyService)
  })

  describe('decodeLog', () => {
    it('should return null for empty log data', async () => {
      const log: any = {}

      const decoded = await alchemyNotifyService.decodeLog(log, decodeABI)

      expect(decoded).toBe(null)
    })

    it('should handle error and return null when decoding fails', async () => {
      const log = eventData.logs[0].transaction.logs[0]

      const expectedArgs = [
        '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
        'Qmec5MYHzixVTc1V7cmsdjGZpcVoMUN2ksCAD6cqKL1zD7',
      ]

      const decodeLog = await alchemyNotifyService.decodeLog(log, decodeABI)

      expect(decodeLog).toEqual(
        expect.objectContaining({ args: expect.arrayContaining(expectedArgs) }),
      )
    })
  })

  describe('isIpfsInserted', () => {
    it('should return true if wiki exists with given ipfs', async () => {
      const ipfs = 'QmWz3aaBqMvPfas3uqMyWdyARRFE9exc3tRQTr2raFjDfg'
      jest.spyOn(service, 'isIpfsInserted').mockResolvedValue(true)
      const existsIpfs = await service.isIpfsInserted(ipfs)

      expect(existsIpfs).toBe(true)
    })
    it('should return false if wiki exists with given ipfs', async () => {
      const ipfs = 'QmWFxbSnYiZL9yfZJqZxXRpBLrgYrmUbs2Scvh3DxzcxG8'
      jest.spyOn(service, 'isIpfsInserted').mockResolvedValue(false)
      const existsIpfs = await service.isIpfsInserted(ipfs)

      expect(existsIpfs).toBe(false)
    })
  })
})
