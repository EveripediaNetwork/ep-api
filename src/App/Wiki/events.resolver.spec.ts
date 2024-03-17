import { Test, TestingModule } from '@nestjs/testing'
import { HttpModule } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { ValidSlug } from '../utils/validSlug'
import DiscordWebhookService from '../utils/discordWebhookService'
import WikiService from './wiki.service'
import EventsService from './events.service'
import {
  EventArgs,
  EventByBlockchainArgs,
  EventByCategoryArgs,
  EventByTitleArgs,
  LangArgs,
} from './wiki.dto'
import { Direction, OrderBy } from '../general.args'
import EventsResolver from './events.resolver'
import WebhookHandler from '../utils/discordWebhookHandler'
import Wiki from '../../Database/Entities/wiki.entity'

describe('EventsResolver', () => {
  let eventsResolver: EventsResolver
  let wikiService: WikiService
  let eventsService: EventsService

  beforeEach(async () => {
    const mockEntityManager: Partial<EntityManager> = {
      getRepository: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        EventsResolver,
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
          id: 'Festival',
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
          id: 'Marketplaces',
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
          id: 'Stablecoins',
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
        {
          id: 'Games',
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
        {
          id: 'Games',
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
          id: 'Developers',
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
      id: 'quantum-miami-2024',
      tags: [
        {
          id: 'Protocols',
          wikis: [],
        },
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

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }

  describe('events', () => {
    it('should handle missing argument', async () => {
      const args: EventArgs = {
        limit: 10,
        offset: 0,
        startDate: '2024-01-01',
        endDate: '2024-02-02',
        tagIds: ['tagId1', 'tagId2', 'tagId3'],
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      const context = {
        req: { body: {} },
      }
      jest.spyOn(eventsService, 'events').mockResolvedValue([])
      jest.spyOn(eventsService, 'resolveWikiRelations').mockResolvedValue([])
      const result = await eventsResolver.events(args, context)
      expect(result).toEqual([])
    })

    it('should return wikis, each wiki should have at least an events tag', async () => {
      const args: EventByCategoryArgs = {
        limit: 10,
        offset: 0,
        category: 'category_id',
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      jest
        .spyOn(wikiService, 'getWikisByCategory')
        .mockResolvedValue(Promise.resolve(testEvents as Wiki[]))
      const result = await eventsResolver.wikiEventsByCategory(args)
      expect(result).toEqual(testEvents)
    })
    it('should return wikis that have the requested tag ids including events', async () => {
      const args: EventArgs = {
        tagIds: ['tagId'],
        lang: 'en',
        hidden: false,
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      jest
        .spyOn(wikiService, 'getWikisByCategory')
        .mockResolvedValue(Promise.resolve(testEvents as Wiki[]))
      const result = await eventsResolver.wikiEventsByCategory(args)
      const filteredEvents = result.filter((testEvent) =>
        testEvent.tags.some((tag) => tag.id === 'Events'),
      )
      expect(filteredEvents.length).toBeGreaterThan(0)
      expect(filteredEvents.length).toBe(result.length)
    })
    it('should work with date filters and return wikis within that range', async () => {
      const args: EventArgs = {
        limit: 10,
        offset: 0,
        startDate: '2024-01-01',
        endDate: '2024-02-02',
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      const context = {
        req: { body: {} },
      }

      jest.spyOn(eventsService, 'events').mockResolvedValue(testEvents)
      jest
        .spyOn(eventsService, 'resolveWikiRelations')
        .mockImplementation((events) => Promise.resolve(events))

      const result = await eventsResolver.events(args, context)
      expect(result).toEqual(testEvents)
    })
  })

  describe('wikiEventsByCategory', () => {
    it('should return an array of events based on category', async () => {
      const args: EventArgs | EventByCategoryArgs = {
        limit: 10,
        offset: 0,
        category: 'category_id',
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      jest
        .spyOn(wikiService, 'repository')
        .mockResolvedValue(mockRepository as unknown as Repository<Wiki>)

      const expectedEvents: Wiki[] = []
      const result = await eventsResolver.wikiEventsByCategory(args)
      expect(result).toEqual(expectedEvents)
    })
  })
  describe('wikiEventsByTitle', () => {
    it('should return an array of events based on title', async () => {
      const args: EventArgs | EventByTitleArgs = {
        limit: 10,
        offset: 0,
        title: 'A title',
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      jest
        .spyOn(wikiService, 'repository')
        .mockResolvedValue(mockRepository as unknown as Repository<Wiki>)

      const expectedEvents: Wiki[] = []
      const result = await eventsResolver.wikiEventsByCategory(args)
      expect(result).toEqual(expectedEvents)
    })
  })

  describe('popularEvents', () => {
    it('should return an array of popular events', async () => {
      jest.spyOn(wikiService, 'getPopularEvents').mockResolvedValue([])
      const args: LangArgs = {
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      const result = await eventsResolver.popularEvents(args)
      expect(result).toEqual([])
    })

    it('should return wikis with the highest views and also contains events tag', async () => {
      const popularEvents: Partial<Wiki>[] = [
        {
          id: 'metavsummit',
          title: 'metavsummit',
          tags: [
            {
              id: 'Ethereum',
              wikis: [],
            },
          ],
          views: 1000,
        },
      ]
      jest
        .spyOn(wikiService, 'getPopularEvents')
        .mockResolvedValue(Promise.resolve(popularEvents as Wiki[]))
      const args: LangArgs = {
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      const result = await eventsResolver.popularEvents(args)
      expect(result).toEqual(popularEvents)
    })
  })
  describe('eventsByBlockchain', () => {
    it('should return events by blockchain', async () => {
      const args: EventByBlockchainArgs = {
        blockchain: 'bitcoin',
        limit: 10,
        offset: 0,
        lang: 'en',
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
        hidden: false,
      }

      const testEvent: Partial<Wiki>[] = [
        {
          id: 'ethdenver-innovation-festival',
          title: 'ethdenver-innovation-festival',
          block: 123,
          tags: [],
        },
      ]

      jest
        .spyOn(eventsService, 'getEventsByBlockchain')
        .mockResolvedValue(testEvent)
      const result = await eventsService.getEventsByBlockchain(args)
      expect(result).toEqual(testEvent)
      result.forEach((event: Wiki) => {
        expect(event.block).toBe(123)
      })
    })
  })
})
