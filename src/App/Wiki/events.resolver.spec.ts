import { Test, TestingModule } from '@nestjs/testing'
import { HttpModule } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DataSource, EntityManager } from 'typeorm'
import { ValidSlug } from '../utils/validSlug'
import DiscordWebhookService from '../utils/discordWebhookService'
import WikiService from './wiki.service'
import EventsService from './events.service'
import {
  EventByCategoryArgs,
  EventByTitleArgs,
} from './wiki.dto'
import EventsResolver from './events.resolver'
import WebhookHandler from '../utils/discordWebhookHandler'
import Wiki from '../../Database/Entities/wiki.entity'

describe('EventsResolver', () => {
  let eventsResolver: EventsResolver
  let eventsService: EventsService
  let wikiService: WikiService

  beforeEach(async () => {
    const mockEntityManager: Partial<EntityManager> = {
      getRepository: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        EventsResolver,
        WikiService,
        {
          provide: EventsService,
          useValue: {
            getEventsByBlockchain: jest.fn(),
            resolveWikiRelations: jest.fn(),
            events: jest.fn(),
          },
        },
        WikiService,
        ValidSlug,
        HttpModule,
        {
          provide: DataSource,
          useValue: {
            manager: mockEntityManager,
          },
        },
        DiscordWebhookService,
        WebhookHandler,
        {
          provide: CACHE_MANAGER,
          useValue: CACHE_MANAGER,
        },
      ],
    }).compile()

    eventsResolver = module.get<EventsResolver>(EventsResolver)
    eventsService = module.get<EventsService>(EventsService)
    wikiService = module.get<WikiService>(WikiService)
  })

  const testEvents: Partial<Wiki>[] = [
    {
      id: 'paris-blockchain-week-5th-edition',
      tags: [
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'Blockchains',
          wikis: [],
        },
      ],
    },
    {
      id: 'blockchain-lagos',
      tags: [
        {
          id: 'Ethereum',
          wikis: [],
        },
        {
          id: 'DEXes',
          wikis: [],
        },
        {
          id: 'Polygon',
          wikis: [],
        },
        {
          id: 'Events',
          wikis: [],
        },
      ],
    },
    {
      id: 'web3-lagos',
      tags: [
        {
          id: 'Ethereum',
          wikis: [],
        },
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'Solana',
          wikis: [],
        },
        {
          id: 'Conference',
          wikis: [],
        },
      ],
    },
    {
      id: 'the-blockchain-event',
      tags: [
        {
          id: 'Polygon',
          wikis: [],
        },
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'AI',
          wikis: [],
        },
        {
          id: 'Conference',
          wikis: [],
        },
      ],
    },
    {
      id: '13th-annual-london-finance-and-capital-markets-conference',
      tags: [
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'AI',
          wikis: [],
        },
        {
          id: 'BinanceSmartChain',
          wikis: [],
        },
        {
          id: 'Blockchains',
          wikis: [],
        },
      ],
    },
    {
      id: 'mwc-barcelona',
      tags: [
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'AI',
          wikis: [],
        },
        {
          id: 'Developers',
          wikis: [],
        },
        {
          id: 'BinanceSmartChain',
          wikis: [],
        },
      ],
    },
    {
      id: 'international-conference-on-blockchain-and-cryptocurrencies',
      tags: [
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'AI',
          wikis: [],
        },
        {
          id: 'Developers',
          wikis: [],
        },
        {
          id: 'BinanceSmartChain',
          wikis: [],
        },
      ],
    },
    {
      id: 'ethdenver-innovation-festival',
      tags: [
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'AI',
          wikis: [],
        },
        {
          id: 'BinanceSmartChain',
          wikis: [],
        },
        {
          id: 'CEXes',
          wikis: [],
        },
      ],
    },
    {
      id: 'web3-revolution-cyprus-blockchain-expo-2024',
      tags: [
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'AI',
          wikis: [],
        },
        {
          id: 'Blockchains',
          wikis: [],
        },
      ],
    },
    {
      id: 'quantum-miami-2024',
      tags: [
        {
          id: 'Ethereum',
          wikis: [],
        },
        {
          id: 'Stablecoins',
          wikis: [],
        },
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'Blockchains',
          wikis: [],
        },
      ],
    },
    {
      id: 'metavsummit',
      tags: [
        {
          id: 'Ethereum',
          wikis: [],
        },
        {
          id: 'Events',
          wikis: [],
        },
        {
          id: 'Blockchains',
          wikis: [],
        },
      ],
    },
  ]

  describe('wikiEventsByTitle', () => {
    it('should return events based on provided title', async () => {
      const title = 'blockchain'
      const args = {
        title,
      } as unknown as EventByTitleArgs
      const eventsByTitle = testEvents.filter(obj => obj.id.toLowerCase().includes('blockchain'));

      jest
        .spyOn(wikiService, 'getWikisByTitle')
        .mockResolvedValueOnce(eventsByTitle as Wiki[])
      const result = await eventsResolver.wikiEventsByTitle(args)
      expect(result).toEqual(eventsByTitle)
      result.forEach(obj => {
        expect(obj.id.toLowerCase()).toContain(title)
      })
    })
  })

  describe('wikiEventsByCategory', () => {
    it('should return events based on provided category', async () => {
      const categoryField = {
        id: 'Cryptocurrencies',
      }

      const category = 'Cryptocurrencies'
      const resultWithCategory = testEvents.map(e => ({
        ...e,
        categories: [categoryField],
      }))

      const args = {
        category,
      } as unknown as EventByCategoryArgs

      jest
        .spyOn(wikiService, 'getWikisByCategory')
        .mockResolvedValueOnce(resultWithCategory as Wiki[])
      const result = await eventsResolver.wikiEventsByCategory(args)

      result.forEach(obj => {
        expect(obj.categories).toBeDefined()
        expect(obj.categories[0].id).toBe('Cryptocurrencies')
      })
    })
  })

})
