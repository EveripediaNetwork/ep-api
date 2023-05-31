import { HttpModule } from '@nestjs/axios'
import { CacheModule } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TestingModule, Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { RevalidatePageService } from '../../../App/revalidatePage/revalidatePage.service'
import IPFSGetterService from '../../IPFSGetter/ipfs-getter.service'
import GraphProviderService from '../../Provider/graph.service'
import MetadataChangesService from '../../Store/metadataChanges.service'
import DBStoreService from '../../Store/store.service'
import IPFSValidatorService from '../../Validator/validator.service'
import RunCommand from '../../run.command'
import IndexerWebhookService from './indexerWebhook.service'
import { BlockData } from '../indexerWehhook.dto'
import User from '../../../Database/Entities/user.entity'
import Language from '../../../Database/Entities/language.entity'

const mockCacheStore = {
  get: jest.fn(),
  set: jest.fn(),
}

describe('IndexerWebhookService', () => {
  let service: IndexerWebhookService
  let moduleRef: TestingModule

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

  const mockQuery = () => ({
    findOneBy: jest.fn().mockReturnValue(result),
  })

  const mockConnection = () => ({
    getRepository: jest.fn().mockImplementation(mockQuery),
  })

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
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
          useFactory: mockConnection,
        },
      ],
    }).compile()

    service = moduleRef.get<IndexerWebhookService>(IndexerWebhookService)
  })

  describe('indexWebhook', () => {
    it('should return false when there are no logs', async () => {
      const eventData = { logs: [] } as unknown as BlockData

      const webhookState = await service.indexWebhook(eventData)

      expect(webhookState).toBe(false)
    })

    it('should return true when logs are present', async () => {
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

      const webhookState = await service.indexWebhook(eventData)

      expect(webhookState).toBe(true)
    })
  })

  describe('decodeLog', () => {
    it('should return null for empty log data', async () => {
      const log: any = {}

      const decoded = await service.decodeLog(log)

      expect(decoded).toBe(null)
    })

    it('should handle error and return null when decoding fails', async () => {
      const log: any = {
        account: {
          address: '0x94bb4c72252d0ae7a98b2b0483dc4145c0c79059',
        },
        data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002e516d6563354d59487a6978565463315637636d73646a475a7063566f4d554e326b734341443663714b4c317a4437000000000000000000000000000000000000',
        topics: [
          '0x0fe877471cb763db81561ce83d01be57b6699361a3febbc7a0cdfb18df66246b',
          '0x0000000000000000000000005456afea3aa035088fe1f9aa36509b320360a89e',
        ],
        index: 2,
      }

      const expectedArgs = [
        '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
        'Qmec5MYHzixVTc1V7cmsdjGZpcVoMUN2ksCAD6cqKL1zD7',
      ]

      const decodeLog = await service.decodeLog(log)

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
