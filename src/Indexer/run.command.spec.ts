import { DataSource } from 'typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import AppService from '../App/app.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import GraphProviderService, { Hash } from './Provider/graph.service'
import RPCProviderService from './RPCProvider/RPCProvider.service'
import DBStoreService from './Store/store.service'
import IPFSValidatorService from './Validator/validator.service'
import RunCommand from './run.command'
import MetadataChangesService from './Store/metadataChanges.service'
import AutoInjestService from '../App/utils/auto-injest'
import Wiki from '../Database/Entities/wiki.entity'
import { CommandOptions, TWENTY_FOUR_HOURS_AGO } from './indexerUtils'
import { getWikiSummary } from '../App/utils/getWikiSummary'
import User from '../Database/Entities/user.entity'

jest.mock('fs/promises')
jest.mock('../App/utils/getWikiSummary')

describe('RunCommand', () => {
  let runCommand: RunCommand
  let appService: AppService
  let providerService: GraphProviderService
  let rpcProviderService: RPCProviderService
  let ipfsGetter: IPFSGetterService
  let validator: IPFSValidatorService
  let dbStoreService: DBStoreService
  let dataSource: DataSource
  let metaChanges: MetadataChangesService
  let iqInjest: AutoInjestService
  let findMock: jest.Mock

  let dataSourceMock = {
    getRepository: jest.fn(() => ({
      find: findMock,
    })),
  }

  let repositoryMock: { find: jest.Mock }

  beforeEach(async () => {
    findMock = jest.fn()
    dataSourceMock = {
      getRepository: jest.fn(() => repositoryMock),
    }
    repositoryMock = {
      find: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunCommand,
        {
          provide: AppService,
          useValue: { apiLevel: jest.fn() },
        },
        {
          provide: GraphProviderService,
          useValue: {
            getIPFSHashesFromBlock: jest.fn(),
          },
        },
        {
          provide: RPCProviderService,
          useValue: {
            getHashesFromLogs: jest.fn(),
          },
        },
        {
          provide: IPFSGetterService,
          useValue: {
            getIPFSDataFromHash: jest.fn(),
          },
        },
        {
          provide: IPFSValidatorService,
          useValue: {
            validate: jest.fn(),
          },
        },
        {
          provide: DBStoreService,
          useValue: {
            storeWiki: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: MetadataChangesService,
          useValue: {
            appendMetadata: jest.fn(),
          },
        },
        {
          provide: AutoInjestService,
          useValue: {
            initiateInjest: jest.fn(),
          },
        },
      ],
    }).compile()

    runCommand = module.get<RunCommand>(RunCommand)
    appService = module.get<AppService>(AppService)
    providerService = module.get<GraphProviderService>(GraphProviderService)
    rpcProviderService = module.get<RPCProviderService>(RPCProviderService)
    ipfsGetter = module.get<IPFSGetterService>(IPFSGetterService)
    validator = module.get<IPFSValidatorService>(IPFSValidatorService)
    dbStoreService = module.get<DBStoreService>(DBStoreService)
    dataSource = module.get<DataSource>(DataSource)
    metaChanges = module.get<MetadataChangesService>(MetadataChangesService)
    iqInjest = module.get<AutoInjestService>(AutoInjestService)
  })

  describe('dependency', () => {
    it('should be defined', () => {
      expect(runCommand).toBeDefined()
    })
    it('should have dependencies correctly injected', () => {
      expect(runCommand['appService']).toBe(appService)
      expect(runCommand['providerService']).toBe(providerService)
      expect(runCommand['rpcProviderService']).toBe(rpcProviderService)
      expect(runCommand['ipfsGetter']).toBe(ipfsGetter)
      expect(runCommand['validator']).toBe(validator)
      expect(runCommand['dbStoreService']).toBe(dbStoreService)
      expect(runCommand['dataSource']).toBe(dataSource)
      expect(runCommand['metaChanges']).toBe(metaChanges)
      expect(runCommand['iqInjest']).toBe(iqInjest)
    })
  })
  describe('getMostRecentWiki', () => {
    it('should return the most recent wiki', async () => {
      const mockWiki = [{ updated: new Date() }] as Wiki[]
      jest
        .spyOn(dataSource.getRepository(Wiki), 'find')
        .mockResolvedValue(mockWiki)
      const result = await runCommand.getMostRecentWiki()
      expect(result).toEqual(mockWiki)
      expect(dataSource.getRepository(Wiki).find).toHaveBeenCalledWith({
        order: { updated: 'DESC' },
        take: 1,
      })
    })
    it('should return the last updated wiki', async () => {
      const wikiEntries = [
        { updated: new Date('2022-01-01T00:00:00Z') },
        { updated: new Date('2023-01-01T00:00:00Z') },
        { updated: new Date('2024-01-01T00:00:00Z') },
      ] as Wiki[]
      jest
        .spyOn(dataSource.getRepository(Wiki), 'find')
        .mockResolvedValue([wikiEntries[2]])
      const result = await runCommand.getMostRecentWiki()
      expect(result).toEqual([wikiEntries[2]])
      expect(dataSource.getRepository(Wiki).find).toHaveBeenCalledWith({
        order: { updated: 'DESC' },
        take: 1,
      })
    })
  })

  describe('getUnixtime', () => {
    it('should return the unixtime of the most recent wiki', async () => {
      const mockWiki = [
        {
          updated: new Date(),
        },
      ] as Wiki[]
      jest.spyOn(runCommand, 'getMostRecentWiki').mockResolvedValue(mockWiki)
      const unixtime = Math.floor(
        new Date(mockWiki[0].updated).getTime() / 1000,
      )
      const result = await runCommand.getUnixtime()
      expect(result).toEqual(unixtime)
      expect(runCommand.getMostRecentWiki).toHaveBeenCalled()
    })

    it('should return the correct unixtime when there are Wiki entries', async () => {
      const wikiEntry = {
        id: '0x5456afea3aa035088fe1f9aa36509b320360a89e',
        updated: new Date('2024-06-01T00:00:00Z'),
        title: 'Most Recent Wiki',
        content: 'Content of the most recent wiki',
      }

      jest.spyOn(runCommand, 'getMostRecentWiki').mockResolvedValue([wikiEntry])

      const result = await runCommand.getUnixtime()
      const expectedUnixtime = Math.floor(
        new Date(wikiEntry.updated).getTime() / 1000,
      )

      expect(result).toBe(expectedUnixtime)
      expect(runCommand.getMostRecentWiki).toHaveBeenCalled()
    })

    it('should return TWENTY_FOUR_HOURS_AGO if no wikis are found', async () => {
      jest.spyOn(runCommand, 'getMostRecentWiki').mockResolvedValue([])

      const result = await runCommand.getUnixtime()

      expect(result).toEqual(TWENTY_FOUR_HOURS_AGO)
      expect(runCommand.getMostRecentWiki).toHaveBeenCalled()
    })
  })
  describe('getHashes', () => {
    it('should return hashes from SUBGRAPH mode', async () => {
      const mockHashes = [
        { id: '0x1', userId: 'user1', createdAt: 1234567890 },
      ] as Hash[]
      jest
        .spyOn(providerService, 'getIPFSHashesFromBlock')
        .mockResolvedValue(mockHashes)

      const result = await runCommand.getHashes('SUBGRAPH', 1234567890, false)

      expect(result).toEqual(mockHashes)
      expect(providerService.getIPFSHashesFromBlock).toHaveBeenCalledWith(
        1234567890,
        false,
      )
    })
  })

  describe('saveToDB', () => {
    it('should save valid IPFS content to the database', async () => {
      const mockUser: User = {
        id: '0x5456afea3aa035088fe1f9aa36509b320360a89e',
      }
      const hash = {
        id: '0x5456afea3aa035088fe1f9aa36509b320360a89e',
        userId: 'someUserId',
        createdAt: 1234567890,
        block: 1,
        transactionHash: '0x',
        contentId: '0x',
      }
      const content = {
        id: '0x5456afea3aa035088fe1f9aa36509b320360a89e',
        summary: 'content test',
        promoted: 5,
        title: 'Save to db test',
        content: 'testing save to db',
        created: '2021-01-01T00:00:00Z',
        updated: '2021-01-01T00:00:00Z',
        block: 1,
        transactionHash: '0x',
        contentId: '0x',
        categories: [],
        tags: [],
        user: mockUser,
        metadata: {},
        language: 'en',
        version: '1',
        hidden: false,
        author: 'user101',
      }
      const metadata = { ...content, additionalField: 'someValue' }
      const summary = 'Some summary'
      jest.spyOn(ipfsGetter, 'getIPFSDataFromHash').mockResolvedValue(content)
      jest.spyOn(metaChanges, 'appendMetadata').mockResolvedValue(metadata)
      ;(getWikiSummary as jest.Mock).mockResolvedValue(summary)
      jest
        .spyOn(validator, 'validate')
        .mockResolvedValue({ status: true, message: 'Successful validation' })

      await runCommand.saveToDB(hash, false, false, 'SUBGRAPH')

      expect(ipfsGetter.getIPFSDataFromHash).toHaveBeenCalledWith(hash.id)
      expect(metaChanges.appendMetadata).toHaveBeenCalledWith(content)
      expect(getWikiSummary).toHaveBeenCalledWith(metadata)
      expect(validator.validate).toHaveBeenCalledWith(
        { ...metadata, summary },
        false,
        hash.userId,
      )
      expect(dbStoreService.storeWiki).toHaveBeenCalledWith(
        { ...metadata, summary },
        hash,
      )
    })
    it('should handle errors gracefully when getIPFSDataFromHash fails', async () => {
      const hash = {
        id: '0x5456afea3aa035088fe1f9aa36509b320360a89e',
        userId: 'someUserId',
        createdAt: 1234567890,
        block: 1,
        transactionHash: '0x',
        contentId: '0x',
      }
      jest
        .spyOn(ipfsGetter, 'getIPFSDataFromHash')
        .mockRejectedValue(new Error('IPFS error'))

      await expect(
        runCommand.saveToDB(hash, false, false, 'SUBGRAPH'),
      ).resolves.toBeUndefined()
      expect(ipfsGetter.getIPFSDataFromHash).toHaveBeenCalledWith(hash.id)
      expect(metaChanges.appendMetadata).not.toHaveBeenCalled()
      expect(validator.validate).not.toHaveBeenCalled()
      expect(dbStoreService.storeWiki).not.toHaveBeenCalled()
    })
  })

  describe('run', () => {
    it('should handle different options and environment variables', async () => {
      process.env.API_LEVEL = 'dev'
      jest.spyOn(runCommand, 'getUnixtime').mockResolvedValue(1234567890)
      jest
        .spyOn(runCommand, 'getHashes')
        .mockResolvedValue([
          { id: 'hash1', userId: 'user1', createdAt: 1234567890 },
        ])
      jest.spyOn(runCommand, 'initiateIndexer').mockResolvedValue(undefined)
      jest
        .spyOn(global.process, 'exit')
        .mockImplementation(() => undefined as never)
      await runCommand.run([], { loop: true, ipfsTime: true, mode: 'RPC' })
      expect(runCommand.getUnixtime).toHaveBeenCalled()
      expect(runCommand.getHashes).toHaveBeenCalledWith('RPC', 1234567890, true)
      expect(runCommand.initiateIndexer).toHaveBeenCalledWith(
        [{ id: 'hash1', userId: 'user1', createdAt: 1234567890 }],
        1234567890,
        'RPC',
        true,
        true,
      )
      expect(process.exit).toHaveBeenCalled()
    })
  })
})
