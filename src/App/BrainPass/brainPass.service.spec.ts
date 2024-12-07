import { Test, TestingModule } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { BigNumber, ethers } from 'ethers'
import { of, throwError } from 'rxjs'
import BrainPassService from './brainPass.service'
import BrainPassRepository from './brainPass.repository'
import PinataService from '../../ExternalServices/pinata.service'
import AlchemyNotifyService from '../../ExternalServices/alchemyNotify.service'
import { BrainPassContractMethods } from './brainPass.dto'

describe('BrainPassService', () => {
  let brainPassService: BrainPassService
  let configService: ConfigService
  let alchemyNotifyService: AlchemyNotifyService
  let httpService: HttpService
  let pinataService: PinataService
  let brainPassRepository: BrainPassRepository

  configService = {
    get: jest.fn().mockImplementation(),
  } as unknown as jest.Mocked<ConfigService>

  alchemyNotifyService = {
    decodeLog: jest.fn(),
    configService: {},
    getSigningKey: jest.fn(),
    isValidSignatureForStringBody: jest.fn(),
    initiateWebhookEvent: jest.fn()
  } as unknown as AlchemyNotifyService

  httpService = {
    get: jest.fn(),
    post: jest.fn(() => of()),
    put: jest.fn(() => of()),
    delete: jest.fn(() => of()),
    patch: jest.fn(() => of()),
    head: jest.fn(() => of()),
    options: jest.fn(() => of()),
    request: jest.fn(() => of()),
    instance: {},
  } as unknown as jest.Mocked<HttpService>

  pinataService = {
    getPinataInstance: jest.fn().mockReturnValue({
      pinJSONToIPFS: jest.fn(),
      hashMetadata: jest.fn(),
    }),
    configService: {},
    getPinataSDK: jest.fn(),
    getPinataAUTH: jest.fn(),
    pinataBearerAuth: jest.fn(),
  } as unknown as PinataService

  const repository = {
    getBrainPassByTxHash: jest.fn().mockReturnValue(Promise.resolve(null)),
    createBrainPass: jest.fn().mockReturnValue(Promise.resolve(undefined)),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrainPassService,
        { provide: ConfigService, useValue: configService },
        { provide: AlchemyNotifyService, useValue: alchemyNotifyService },
        { provide: HttpService, useValue: httpService },
        { provide: PinataService, useValue: pinataService },
        { provide: BrainPassRepository, useValue: repository },
      ],
    }).compile()

    brainPassService = module.get<BrainPassService>(BrainPassService)
    configService = module.get<ConfigService>(ConfigService)
    alchemyNotifyService = module.get<AlchemyNotifyService>(AlchemyNotifyService)
    httpService = module.get<HttpService>(HttpService)
    pinataService = module.get<PinataService>(PinataService)
    brainPassRepository = module.get<BrainPassRepository>(BrainPassRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getDefaultData', () => {
    it('should return default image and description from config', async () => {
        const image = 'default-image.jpg';
        const description = 'Default BrainPass description';
  
        jest.spyOn(configService, 'get').mockImplementation((key: string) => {
          if (key === 'BRAINPASS_DEFAULT_IMAGE') return image;
          if (key === 'BRAINPASS_DEFAULT_DESCRIPTION') return description;
          return null;
        });
  
        const result = await brainPassService.getDefaultData();
        
        expect(result).toEqual({
          image,
          description,
        });
        expect(configService.get).toHaveBeenCalledTimes(2);
    })
    
    it('should return undefined if config values are not set', async () => {
        jest.spyOn(configService, 'get').mockImplementation(() => undefined)
  
        const result = await brainPassService.getDefaultData()
        
        expect(result).toEqual({
          image: undefined,
          description: undefined,
        })
      })
  })

  describe('decodeNFTEvent', () => {
    it('should decode NFT event data correctly', async () => {
      const log = [
        {
          address: '0x1234567890123456789012345678901234567890',
          topics: [],
          data: '0x987654323456789876543234567890987643',
        },
        {
          address: '0x1234567890123456789012345678901234567890',
          topics: [
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 
          ],
          data: '0x09876543212345678987654321345689',
          args: {
            _tokenId: BigNumber.from(1),
            _owner: '0x1234567890123456789012345678901234567890',
            _passId: BigNumber.from(2),
            _price: BigNumber.from(ethers.utils.parseEther('0.1')),
            _passName: 'TestPass',
          },
          name: BrainPassContractMethods.MINT,
        }
      ] as any
  
      jest.spyOn(alchemyNotifyService, 'decodeLog').mockResolvedValue({
        args: {
          _tokenId: BigNumber.from(1),
          _owner: '0x1234567890123456789012345678901234567890',
          _passId: BigNumber.from(2),
          _price: BigNumber.from(ethers.utils.parseEther('0.1')),
          _passName: 'TestPass'
        },
        name: BrainPassContractMethods.MINT,
        ...[]
      })
  
      const result = await brainPassService.decodeNFTEvent(log)
      expect(result).toEqual({
        tokenId: 1,
        owner: '0x1234567890123456789012345678901234567890',
        passId: 2,
        price: '0.1',
        passName: 'TestPass',
        transactionName: BrainPassContractMethods.MINT,
        attributes: [],
      })
      expect(alchemyNotifyService.decodeLog).toHaveBeenCalledWith(log, expect.anything())
    })
  })

  describe('getPinataData', () => {
    it('should return metadata from Pinata when request is successful', async () => {
      const pinataResponse = {
        data: {
          description: 'test description',
          image: 'test-image.jpg',
          name: 'TestPass',
          attributes: [],
        },
      }

      httpService.get.mockReturnValue(of(pinataResponse))
      configService.get.mockImplementation((key: string) => {
        const config = {
          BRAINPASS_DEFAULT_IMAGE: 'default-image.jpg',
          BRAINPASS_DEFAULT_DESCRIPTION: 'default description',
        }
        return config[key as keyof typeof config]
      })

      const result = await brainPassService.getPinataData('test-hash')
      expect(result).toEqual(pinataResponse.data)
      expect(httpService.get).toHaveBeenCalledWith(
        `https://gateway.pinata.cloud/ipfs/${'test-hash'}`
      )
    })

    it('should return default metadata when Pinata request fails', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Network error')))
      configService.get.mockImplementation((key: string) => {
        const config = {
          BRAINPASS_DEFAULT_IMAGE: 'default-image.jpg',
          BRAINPASS_DEFAULT_DESCRIPTION: 'default description',
        }
        return config[key as keyof typeof config]
      })

      const result = await brainPassService.getPinataData('test-hash')
      expect(result).toEqual({
        description: 'default description',
        image: 'default-image.jpg',
        name: 'BrainPass',
        attributes: [],
      })
    })
    
    it('should handle network timeout gracefully', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('Timeout error')))
      configService.get.mockImplementation((key: string) => {
        const config = {
          BRAINPASS_DEFAULT_IMAGE: 'default-image.jpg',
          BRAINPASS_DEFAULT_DESCRIPTION: 'default description',
        }
        return config[key as keyof typeof config]
      })

      const result = await brainPassService.getPinataData('test-hash')
      
      expect(result).toEqual({
        description: 'default description',
        image: 'default-image.jpg',
        name: 'BrainPass',
        attributes: [],
      })
    })
  })

  describe('storeMintData', () => {
    const decodedData = {
      tokenId: 1,
      owner: '0x1234567890123456789012345678901234567890',
      passId: 2,
      price: '0.1',
      passName: 'TestPass',
      transactionName: BrainPassContractMethods.MINT,
      attributes: [],
    }

    it('should store mint data when transaction is new', async () => {
      const eventLog = {
        transaction: {
          logs: [
            {},
            {
                address: '0x1234567890123456789012345678901234567890',
                topics: [
                  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 
                ],
                data: '0x12345678900987654322345678987654323456789',
              args: {
                _tokenId: BigNumber.from(1),
                _owner: '0x1234567890123456789012345678901234567890',
                _passId: BigNumber.from(2),
                _price: BigNumber.from(ethers.utils.parseEther('0.1')),
                _passName: 'TestPass',
              },
            },
          ],
          hash: 'tx-hash',
        },
      }

      const pinataInstance = {
        pinJSONToIPFS: jest.fn().mockResolvedValue({ IpfsHash: 'test-ipfs-hash' }),
        hashMetadata: jest.fn().mockResolvedValue({}),
      }

      jest.spyOn(brainPassService, 'getDefaultData').mockResolvedValue({
        image: 'default-image.jpg',
        description: 'Default description',
      })

      jest.spyOn(brainPassService, 'decodeNFTEvent').mockResolvedValue(decodedData)
      pinataService.getPinataInstance.mockReturnValue(pinataInstance)
      brainPassRepository.getBrainPassByTxHash.mockResolvedValue(null)
      brainPassRepository.createBrainPass.mockResolvedValue(undefined)

      await brainPassService.storeMintData(eventLog)

      expect(brainPassRepository.createBrainPass).toHaveBeenCalled()
      expect(pinataInstance.pinJSONToIPFS).toHaveBeenCalled()
      expect(pinataInstance.hashMetadata).toHaveBeenCalled()
    })

    it('should not store mint data when transaction already exists', async () => {
        const eventLog = {
            transaction: {
              logs: [
                {},
                {
                  address: '0x1234567890123456789012345678901234567890',
                  topics: [
                    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 
                  ],
                  data: '0x9876543234578909876432123456765421234567890',
                  args: {
                    _tokenId: BigNumber.from(1),
                    _owner: '0x1234567890123456789012345678901234567890',
                    _passId: BigNumber.from(2),
                    _price: BigNumber.from(ethers.utils.parseEther('0.1')),
                    _passName: 'TestPass',
                  },
                  name: BrainPassContractMethods.MINT,
                }
              ],
              hash: 'tx-hash',
            },
          }
      
          jest.spyOn(brainPassService, 'decodeNFTEvent').mockResolvedValue(decodedData)
          brainPassRepository.getBrainPassByTxHash.mockResolvedValue({ id: 1 })
      
          await brainPassService.storeMintData(eventLog)
      
          expect(brainPassRepository.createBrainPass).not.toHaveBeenCalled()
    })
  })
}) 