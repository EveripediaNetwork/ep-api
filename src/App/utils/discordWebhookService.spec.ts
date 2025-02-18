import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import DiscordWebhookService from './discordWebhookService'
import WebhookHandler from './discordWebhookHandler'
import { ActionTypes } from './utilTypes'

describe('DiscordWebhookService', () => {
  let discordWebhookService: DiscordWebhookService
  let webhookHandler: WebhookHandler
  let cacheManager: Cache

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordWebhookService,
        {
          provide: WebhookHandler,
          useValue: {
            postWebhook: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile()

    discordWebhookService = module.get<DiscordWebhookService>(
      DiscordWebhookService,
    )
    webhookHandler = module.get<WebhookHandler>(WebhookHandler)
    cacheManager = module.get<Cache>(CACHE_MANAGER)
  })

  it('should be defined', () => {
    expect(discordWebhookService).toBeDefined()
  })

  it('should handle addressToWikiRequestLogs correctly', async () => {
    const cachedData = {
      knownAddresses: { test: 1 },
      unknownAddresses: ['unknown1'],
    }
    jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedData)
    jest.spyOn(webhookHandler, 'postWebhook').mockResolvedValue(true)

    await discordWebhookService.addressToWikiRequestLogs()

    expect(webhookHandler.postWebhook).toHaveBeenCalledWith(
      ActionTypes.WIKI_ETH_ADDRESS,
      cachedData,
    )
  })

  it('should update addressToWikiCache correctly', async () => {
    const addressData = { token: { name: 'testToken' }, hash: 'testHash' }
    const cachedData = {
      knownAddresses: {},
      unknownAddresses: [],
    }
    jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedData)
    jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined)

    await discordWebhookService.updateAddressToWikiCache(addressData)

    expect(cacheManager.set).toHaveBeenCalledWith('address_to_wiki_cache', {
      knownAddresses: { testToken: 1 },
      unknownAddresses: [],
    })
  })
})
