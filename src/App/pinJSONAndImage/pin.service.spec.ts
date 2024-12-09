import { Test, TestingModule } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { DataSource, Repository } from 'typeorm'
import { EventAction } from '@everipedia/iq-utils'
import * as fs from 'fs'
import PinService from './pin.service'
import PinataService from '../../ExternalServices/pinata.service'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'
import ActivityRepository from '../Activities/activity.repository'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import SecurityTestingService from '../utils/securityTester'
import WebhookHandler from '../utils/discordWebhookHandler'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'

jest.mock('fs')

describe('PinService', () => {
  let pinService: PinService
  let dataSource: DataSource
  let marketCapIdsRepository: Repository<MarketCapIds>

  const pinataInstance = {
    pinFileToIPFS: jest.fn(),
    pinJSONToIPFS: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              create: jest.fn(),
              save: jest.fn(),
              findBy: jest.fn(),
              findOneBy: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              createQueryBuilder: jest.fn().mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                into: jest.fn().mockReturnThis(),
                values: jest.fn().mockReturnThis(),
                execute: jest.fn(),
              }),
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-api-key'),
          },
        },
        {
          provide: PinataService,
          useValue: {
            getPinataInstance: jest.fn().mockReturnValue(pinataInstance),
          },
        },
        {
          provide: IPFSValidatorService,
          useValue: {
            validate: jest.fn(),
          },
        },
        {
          provide: SecurityTestingService,
          useValue: {
            checkContent: jest.fn(),
          },
        },
        {
          provide: ActivityRepository,
          useValue: {
            countUserActivity: jest.fn(),
          },
        },
        {
          provide: MetadataChangesService,
          useValue: {
            removeEditMetadata: jest.fn(),
          },
        },
        {
          provide: WebhookHandler,
          useValue: {
            postWebhook: jest.fn(),
          },
        },
      ],
    }).compile()

    pinService = module.get<PinService>(PinService)
    dataSource = module.get<DataSource>(DataSource)
    marketCapIdsRepository = dataSource.getRepository(MarketCapIds)
  })

  describe('pinImage', () => {
    it('should successfully pin an image', async () => {
      const file = 'test.jpg'
      const response = { IpfsHash: 'test-hash' }
      ;(fs.createReadStream as jest.Mock).mockReturnValue('mock-stream')
      pinataInstance.pinFileToIPFS.mockResolvedValue(response)

      const result = await pinService.pinImage(file)

      expect(result).toEqual(response)
      expect(fs.createReadStream).toHaveBeenCalledWith(file)
      expect(pinataInstance.pinFileToIPFS).toHaveBeenCalled()
    })

    it('should handle pinning image error', async () => {
      const file = 'test.jpg'
      const error = new Error('Pinning failed')
      ;(fs.createReadStream as jest.Mock).mockReturnValue('mock-stream')
      pinataInstance.pinFileToIPFS.mockRejectedValue(error)

      const result = await pinService.pinImage(file)

      expect(result).toEqual(error)
    })
  })

  describe('pinJSON', () => {
    const baseWikiData = {
      id: '123',
      title: 'Test Wiki',
      content: 'Test content',
      user: { id: 'user123' },
      events: [],
      metadata: [],
    }

    const createWikiData = (overrides = {}) => ({
      ...baseWikiData,
      ...overrides,
    })

    beforeEach(() => {
      jest
        .spyOn((pinService as any).metadataChanges, 'removeEditMetadata')
        .mockResolvedValue(baseWikiData)
      jest
        .spyOn((pinService as any).validator, 'validate')
        .mockResolvedValue({ status: true })
      jest
        .spyOn((pinService as any).activityRepository, 'countUserActivity')
        .mockResolvedValue(0)
    })

    describe('Succesful Pin', () => {
      it('should successfully pin JSON data', async () => {
        const response = { IpfsHash: 'test-hash' }
        pinataInstance.pinJSONToIPFS.mockResolvedValue(response)

        const result = await pinService.pinJSON(JSON.stringify(baseWikiData))

        expect(result).toEqual(response)
        expect(pinataInstance.pinJSONToIPFS).toHaveBeenCalled()
      })
    })
    describe('Event Handling', () => {
      it('should handle events with partial date', async () => {
        const wikiData = createWikiData({
          events: [
            {
              action: EventAction.CREATE,
              date: '2024-01',
              description: 'Test event',
            },
          ],
        })

        jest.spyOn(pinService as any, 'updateEventsTable').mockResolvedValue({
          createdEvents: [{ id: 'event1', date: '2023-01-01' }],
          updatedEvents: [],
          deletedEvents: [],
        })

        pinataInstance.pinJSONToIPFS.mockResolvedValue({
          IpfsHash: 'test-hash',
        })

        const result = await pinService.pinJSON(JSON.stringify(wikiData))

        expect(result).toEqual({ IpfsHash: 'test-hash' })
        expect(pinataInstance.pinJSONToIPFS).toHaveBeenCalled()
      })

      it('should handle multiple event types', async () => {
        const wikiData = createWikiData({
          events: [
            { action: EventAction.CREATE, description: 'Create event' },
            { action: EventAction.EDIT, description: 'Edit event' },
            { action: EventAction.DELETE, description: 'Delete event' },
          ],
        })

        const updateEventsSpy = jest
          .spyOn(pinService as any, 'updateEventsTable')
          .mockResolvedValue({
            createdEvents: [{ id: 'event1' }],
            updatedEvents: [{ id: 'event2' }],
            deletedEvents: [{ id: 'event3' }],
          })

        pinataInstance.pinJSONToIPFS.mockResolvedValue({
          IpfsHash: 'test-hash',
        })

        const result = await pinService.pinJSON(JSON.stringify(wikiData))

        expect(result).toEqual({ IpfsHash: 'test-hash' })
        expect(updateEventsSpy).toHaveBeenCalled()
      })

      it('should throw error when user activity limit exceeded', async () => {
        jest
          .spyOn((pinService as any).activityRepository, 'countUserActivity')
          .mockResolvedValue(1000)

        await expect(
          pinService.pinJSON(JSON.stringify(baseWikiData)),
        ).rejects.toThrow()
      })
    })

    describe('CoinGecko API ID Handling', () => {
      it('should handle CoinGecko profile metadata', async () => {
        const wikiData = createWikiData({
          metadata: [
            {
              id: 'coingecko_profile',
              value: 'https://www.coingecko.com/en/coins/test-coin',
            },
          ],
        })

        marketCapIdsRepository.findOneBy = jest.fn().mockResolvedValue(null)
        marketCapIdsRepository.create = jest.fn().mockReturnValue({
          wikiId: wikiData.id,
          coingeckoId: 'test-coin',
        })
        marketCapIdsRepository.save = jest.fn()

        pinataInstance.pinJSONToIPFS.mockResolvedValue({
          IpfsHash: 'test-hash',
        })

        const result = await pinService.pinJSON(JSON.stringify(wikiData))

        expect(result).toEqual({ IpfsHash: 'test-hash' })
      })
    })
  })
  describe('Utility Methods', () => {
    it('findMatchingObject should correctly match objects', () => {
      const objects = [
        { name: 'test', value: 1 },
        { name: 'another', value: 2 },
      ]

      const result = pinService.findMatchingObject(objects, { name: 'test' })
      expect(result).toEqual({ name: 'test', value: 1 })

      const noMatchResult = pinService.findMatchingObject(objects, {
        name: 'missing',
      })
      expect(noMatchResult).toBeUndefined()
    })
  })
})
