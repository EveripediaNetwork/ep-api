import * as fs from 'fs'
import * as path from 'path'
import PinService from './pin.service'
import { HttpException } from '@nestjs/common'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import ActivityRepository from '../Activities/activity.repository'
import SecurityTestingService from '../utils/securityTester'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import { DataSource } from 'typeorm'
import ActivityService from '../Activities/activity.service'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import PinataService from '../../ExternalServices/pinata.service'
import pinJSONToIPFS from '@pinata/sdk/types/commands/pinning/pinJSONToIPFS'
import PinataClient, { PinataConfig } from '@pinata/sdk'

const pinataServiceMock = {
  getPinataInstance: jest.fn(() => ({
    pinJSONToIPFS: jest.fn(async (data, options) => {
      throw new Error('Media Error')
    }),
  })),
}

jest.mock('fs')
jest.mock('../Activities/activity.repository', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    createEntityManager: jest.fn(),
  })),
}))
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn(() => ({
    get: jest.fn(),
  })),
}))
jest.mock('../../ExternalServices/pinata.service', () => ({
  __esModule: true,
  default: jest.fn(() => pinataServiceMock),
}))

describe('PinService', () => {
  let pinService: PinService
  let activityRepository: ActivityRepository
  let securityTestingService: SecurityTestingService
  let metadataChangesService: MetadataChangesService
  let webhookHandler: WebhookHandler
  let pinataService: jest.Mocked<PinataService>
  let ipfsValidatorService: IPFSValidatorService

  beforeEach(() => {
    const dataSourceMock = {
      getRepository: jest.fn(),
      findOneBy: jest.fn(),
    } as unknown as DataSource
    const activityServiceMock = {} as ActivityService
    const configServiceMock = {} as ConfigService
    const httpServiceMock = {} as HttpService
    const activityRepositoryMock = {} as ActivityRepository
    const pinataServiceMock = {} as PinataService

    activityRepository = new ActivityRepository(
      dataSourceMock,
      activityServiceMock,
    )
    ipfsValidatorService = new IPFSValidatorService()
    securityTestingService = new SecurityTestingService(configServiceMock)
    metadataChangesService = new MetadataChangesService(dataSourceMock)
    webhookHandler = new WebhookHandler(
      dataSourceMock,
      configServiceMock,
      httpServiceMock,
    )
    pinataService = new PinataService(
      configServiceMock,
    ) as jest.Mocked<PinataService>

    pinService = new PinService(
      activityRepositoryMock,
      pinataService,
      ipfsValidatorService,
      securityTestingService,
      metadataChangesService,
      webhookHandler,
    )
  })
  describe('pinImage', () => {
    it('should handle media error', async () => {
      const readStreamMock = jest.spyOn(fs, 'createReadStream')
      const pinataServiceMock = {
        getPinataInstance: jest.fn(() => ({
          pinFileToIPFS: jest.fn(() => {
            throw new Error('Media Error')
          }),
        })),
      }
      const pinService = new PinService(
        activityRepository,
        pinataService,
        ipfsValidatorService,
        securityTestingService,
        metadataChangesService,
        webhookHandler,
      )
      const someImagePath = path.join(__dirname, 'braindao.jpeg')
      const result = await pinService.pinImage(someImagePath)

      expect(readStreamMock).toHaveBeenCalled()
      expect(result).toEqual({ error: 'Media Error' })
    })
  })
  describe('pinJSON', () => {
    it('should handle API timeout', async () => {
      const body = '{"title": "Test Wiki"}'
      jest
        .spyOn(pinService['metadataChanges'], 'removeEditMetadata')
        .mockImplementationOnce(() => {
          throw { code: 'ETIMEOUT' }
        })
      jest
        .spyOn(
          metadataChangesService,
          'findWiki' as keyof MetadataChangesService,
        )
        .mockImplementationOnce(() => {
          throw { code: 'ETIMEOUT' }
        })
      const result = await pinService.pinJSON(body)
      expect(result).toEqual({ error: 'Unexpected Error' })
    })
    it('should throw error if API timeout occurs', async () => {
      const body =
        '{"title": "Example Wiki", "content": "This is an example wiki"}'
      jest.spyOn(pinService, 'pinJSON').mockRejectedValue({ code: 'ETIMEOUT' })

      await expect(pinService.pinJSON(body)).rejects.toEqual({
        code: 'ETIMEOUT',
      })
    })
  })
})
