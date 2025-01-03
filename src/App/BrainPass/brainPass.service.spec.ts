import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { BigNumber } from 'ethers'
import { of, throwError } from 'rxjs'
import { ethers } from 'ethers'
import BrainPassService from './brainPass.service'
import BrainPassRepository from './brainPass.repository'
import PinataService from '../../ExternalServices/pinata.service'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'
import { BrainPassContractMethods } from './brainPass.dto'
import { TxData } from '../../ExternalServices/alchemyNotify.dto'

describe('BrainPassService', () => {
  let brainPassService: BrainPassService
  let configService: ConfigService
  let alchemyNotifyService: AlchemyNotifyService
  let httpService: HttpService
  let pinataService: PinataService
  let repository: BrainPassRepository

  const mockConfigService = {
    get: jest.fn(),
  }

  const mockAlchemyNotifyService = {
    decodeLog: jest.fn(),
  }

  const mockHttpService = {
    get: jest.fn(),
  }

  const pinataInstance = {
    pinJSONToIPFS: jest.fn(),
    hashMetadata: jest.fn(),
  }

  const mockPinataService = {
    getPinataInstance: jest.fn().mockReturnValue(pinataInstance),
  }

  const mockRepo = {
    getBrainPassByTxHash: jest.fn(),
    createBrainPass: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrainPassService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AlchemyNotifyService,
          useValue: mockAlchemyNotifyService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: PinataService,
          useValue: mockPinataService,
        },
        {
          provide: BrainPassRepository,
          useValue: mockRepo,
        },
      ],
    }).compile()

    brainPassService = module.get<BrainPassService>(BrainPassService)
    configService = module.get<ConfigService>(ConfigService)
    alchemyNotifyService =
      module.get<AlchemyNotifyService>(AlchemyNotifyService)
    httpService = module.get<HttpService>(HttpService)
    pinataService = module.get<PinataService>(PinataService)
    repository = module.get<BrainPassRepository>(BrainPassRepository)

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'BRAINPASS_DEFAULT_IMAGE') return 'default-image'
      if (key === 'BRAINPASS_DEFAULT_DESCRIPTION') return 'default-description'
      return null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getDefaultData', () => {
    it('should return default image and description from config', async () => {
      const image = 'default-image-url'
      const description = 'default-description'

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'BRAINPASS_DEFAULT_IMAGE') return image
        if (key === 'BRAINPASS_DEFAULT_DESCRIPTION') return description
        return null
      })

      const result = await brainPassService.getDefaultData()

      expect(result).toEqual({
        image,
        description,
      })
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'BRAINPASS_DEFAULT_IMAGE',
      )
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'BRAINPASS_DEFAULT_DESCRIPTION',
      )
    })
  })

  describe('decodeNFTEvent', () => {
    it('should correctly decode NFT event log', async () => {
      const log: TxData = {
        topics: [
          '0x1234567890abcdef',
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        ],
        data: '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000001234567890987654321000000000000000000000',
        account: { address: '0x1234567890987654321' },
        index: 0,
      }
      const decodedData = {
        args: {
          _tokenId: BigNumber.from('1'),
          _owner: '0x1234567890987654321',
          _passId: BigNumber.from('2'),
          _price: ethers.utils.parseEther('1.0'),
          _passName: 'pass',
        },
        name: 'event',
      }

      mockAlchemyNotifyService.decodeLog.mockResolvedValue(decodedData)

      const result = await brainPassService.decodeNFTEvent(log)

      expect(result).toEqual({
        tokenId: 1,
        owner: '0x1234567890987654321',
        passId: 2,
        price: '1.0',
        passName: 'pass',
        transactionName: 'event',
        attributes: [],
      })
    })

    it('should handle incomplete log data', async () => {
      const incompleteLog: TxData = {
        topics: ['0x1234567890abcdef'],
        data: '0x',
        account: { address: '0x1234567890987654321' },
        index: 0,
      }

      mockAlchemyNotifyService.decodeLog.mockResolvedValue({
        args: {
          _tokenId: BigNumber.from('0'),
          _owner: null,
          _passId: BigNumber.from('0'),
          _price: ethers.utils.parseEther('0'),
          _passName: '',
        },
        name: '',
      })

      const result = await brainPassService.decodeNFTEvent(incompleteLog)

      expect(result).toEqual({
        tokenId: 0,
        owner: null,
        passId: 0,
        price: '0.0',
        passName: '',
        transactionName: '',
        attributes: [],
      })
    })

    it('should handle unsupported event', async () => {
      const log: TxData = {
        topics: ['0xUnsupportedEventSignature'],
        data: '0x',
        account: { address: '0x1234567890987654321' },
        index: 0,
      }

      mockAlchemyNotifyService.decodeLog.mockRejectedValue(
        new Error('Unsupported event'),
      )

      await expect(brainPassService.decodeNFTEvent(log)).rejects.toThrow(
        'Unsupported event',
      )
    })

    it('should handle malformed decoded data', async () => {
      const log: TxData = {
        topics: ['0x1234567890abcdef'],
        data: '0x',
        account: { address: '0x1234567890987654321' },
        index: 0,
      }

      mockAlchemyNotifyService.decodeLog.mockResolvedValue({
        args: {
          _tokenId: 'definitely-not-a-number',
          _price: 'invalid-price',
        },
      })

      await expect(brainPassService.decodeNFTEvent(log)).rejects.toThrow()
    })
  })

  describe('storeMintData', () => {
    it('should store mint data and create IPFS entry for new NFT mint', async () => {
      const eventLog = {
        transaction: {
          logs: [{}, {}],
          hash: '0xasdfghjkl',
        },
      }

      const mockIpfsResponse = {
        IpfsHash: 'hash345678909876asdfghjkl',
      }

      mockAlchemyNotifyService.decodeLog.mockResolvedValue({
        args: {
          _tokenId: BigNumber.from('1'),
          _owner: '0x1234567890987654321',
          _passId: BigNumber.from('2'),
          _price: ethers.utils.parseEther('1.0'),
          _passName: 'pass',
        },
        name: BrainPassContractMethods.MINT,
      })

      pinataInstance.pinJSONToIPFS.mockResolvedValue(mockIpfsResponse)
      mockRepo.getBrainPassByTxHash.mockResolvedValue(null)

      await brainPassService.storeMintData(eventLog)

      expect(pinataInstance.pinJSONToIPFS).toHaveBeenCalled()
      expect(pinataInstance.hashMetadata).toHaveBeenCalled()
      expect(mockRepo.createBrainPass).toHaveBeenCalled()
    })

    it('should not store data if transaction already exists', async () => {
      const eventLog = {
        transaction: {
          logs: [{}, {}],
          hash: '0xasdfghjkl',
        },
      }

      mockAlchemyNotifyService.decodeLog.mockResolvedValue({
        args: {
          _tokenId: BigNumber.from('1'),
          _owner: '0x1234567890987654321',
          _passId: BigNumber.from('2'),
          _price: ethers.utils.parseEther('1.0'),
          _passName: 'pass',
        },
        name: 'event',
      })

      mockRepo.getBrainPassByTxHash.mockResolvedValue({ id: 1 })

      await brainPassService.storeMintData(eventLog)

      expect(mockRepo.createBrainPass).not.toHaveBeenCalled()
    })

    it('should handle IPFS pinning failure', async () => {
      const eventLog = {
        transaction: {
          logs: [{}, {}],
          hash: '0xasdfghjkl',
        },
      }

      mockAlchemyNotifyService.decodeLog.mockResolvedValue({
        args: {
          _tokenId: BigNumber.from('1'),
          _owner: '0x1234567890987654321',
          _passId: BigNumber.from('2'),
          _price: ethers.utils.parseEther('1.0'),
          _passName: 'pass',
        },
        name: BrainPassContractMethods.MINT,
      })

      pinataInstance.pinJSONToIPFS.mockRejectedValue(new Error('IPFS Error'))
      mockRepo.getBrainPassByTxHash.mockResolvedValue(null)

      await expect(brainPassService.storeMintData(eventLog)).rejects.toThrow(
        'IPFS Error',
      )
    })

    it('should handle repository save failure', async () => {
      const eventLog = {
        transaction: {
          logs: [{}, {}],
          hash: '0xasdfghjkl',
        },
      }

      mockAlchemyNotifyService.decodeLog.mockResolvedValue({
        args: {
          _tokenId: BigNumber.from('1'),
          _owner: '0x1234567890987654321',
          _passId: BigNumber.from('2'),
          _price: ethers.utils.parseEther('1.0'),
          _passName: 'pass',
        },
        name: BrainPassContractMethods.MINT,
      })

      pinataInstance.pinJSONToIPFS.mockResolvedValue({ IpfsHash: 'hash' })
      mockRepo.getBrainPassByTxHash.mockResolvedValue(null)
      mockRepo.createBrainPass.mockRejectedValue(new Error('DB Error'))

      await expect(brainPassService.storeMintData(eventLog)).rejects.toThrow(
        'DB Error',
      )
    })
  })

  describe('getPinataData', () => {
    beforeEach(() => {
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            name: 'pass',
            description: 'default-description',
            image: 'default-image',
            attributes: [],
          },
        }),
      )
    })
    it('should fetch and return metadata from Pinata', async () => {
      const hash = 'hash345678909876asdfghjkl'
      const pinataResponse = {
        data: {
          description: 'Description',
          image: 'image-url',
          name: 'pass',
          attributes: [],
        },
      }

      mockHttpService.get.mockReturnValue(of(pinataResponse))

      const result = await brainPassService.getPinataData(hash)

      expect(result).toEqual(pinataResponse.data)
      expect(httpService.get).toHaveBeenCalledWith(
        `https://gateway.pinata.cloud/ipfs/${hash}`,
      )
    })

    it('should return default metadata if Pinata request fails', async () => {
      const hash = 'hash345678909876asdfghjkl'
      const defaultData = {
        image: 'default-image',
        description: 'default-description',
      }

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'BRAINPASS_DEFAULT_IMAGE') return defaultData.image
        if (key === 'BRAINPASS_DEFAULT_DESCRIPTION')
          return defaultData.description
        return null
      })

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      )

      const result = await brainPassService.getPinataData(hash)

      expect(result).toEqual({
        description: defaultData.description,
        image: defaultData.image,
        name: 'BrainPass',
        attributes: [],
      })
    })

    it('should handle empty hash input', async () => {
      const emptyHash = ''
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Invalid hash format')),
      )

      const result = await brainPassService.getPinataData(emptyHash)
      expect(result).toEqual({
        name: 'BrainPass',
        description: 'default-description',
        image: 'default-image',
        attributes: [],
      })
    })

    it('should handle invalid hash format', async () => {
      const invalidHash = 'invalid-hash-format!'
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Invalid hash format')),
      )

      const result = await brainPassService.getPinataData(invalidHash)
      expect(result).toEqual({
        name: 'BrainPass',
        description: 'default-description',
        image: 'default-image',
        attributes: [],
      })
    })
  })
})
