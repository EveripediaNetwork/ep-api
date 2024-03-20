import { Test, TestingModule } from '@nestjs/testing'
import { HttpModule } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DataSource, EntityManager } from 'typeorm'
import { ValidSlug } from '../utils/validSlug'
import DiscordWebhookService from '../utils/discordWebhookService'
import WikiService from './wiki.service'
import EventsService from './events.service'
import { EventArgs, EventByCategoryArgs, eventTag } from './wiki.dto'
import EventsResolver from './events.resolver'
import WebhookHandler from '../utils/discordWebhookHandler'
import Wiki from '../../Database/Entities/wiki.entity'
import { Direction, OrderBy } from '../general.args'

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

  describe('events', () => {
    it('should return events based on provided arguments', async () => {
      const args: EventArgs = {
        tagIds: ['id1', 'id2'],
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
        limit: 10,
        offset: 0,
      }

      const context = {
        req: {
          body: {
            query: 'a_query',
          },
        },
      }

      jest.spyOn(eventsService, 'events').mockResolvedValue(testEvents)
      jest
        .spyOn(eventsService, 'resolveWikiRelations')
        .mockResolvedValue(testEvents)

      const result = await eventsResolver.events(args, context)

      expect(result).toEqual(testEvents)
      expect(eventsService.events).toHaveBeenCalledWith(
        [eventTag, ...(args.tagIds || [])],
        args,
      )
      expect(eventsService.resolveWikiRelations).toHaveBeenCalledWith(
        testEvents,
        context.req.body.query,
      )
    })

    it('should handle missing arguments', async () => {
      const context = { req: { body: {} } }

      await expect(
        eventsResolver.events(undefined as unknown as EventArgs, context),
      ).rejects.toThrow()
    })

    it('should throw an error if relation resolution fails', async () => {
      jest
        .spyOn(eventsService, 'resolveWikiRelations')
        .mockImplementation(() => {
          throw new Error('Relation resolution failed')
        })

      const context = {
        req: {
          body: {
            query: 'a_query',
          },
        },
      }

      const result = async () => {
        await eventsResolver.events({} as EventArgs, context)
      }

      await expect(result()).rejects.toThrow('Relation resolution failed')
    })

    it('should throw an error when retrieval fails', async () => {
      jest
        .spyOn(eventsService, 'events')
        .mockRejectedValue(new Error('Events retrieval failed'))

      const context = {
        req: {
          body: {
            query: 'a_query',
          },
        },
      }

      const result = async () => {
        await eventsResolver.events({} as EventArgs, context)
      }

      await expect(result()).rejects.toThrow('Events retrieval failed')
    })
  })

  describe('wikiEventsByCategory', () => {
    it('should return an array of events based on category', async () => {
      const args: EventByCategoryArgs = {
        category: 'blockchain',
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
        limit: 10,
        offset: 0,
      }

      jest
        .spyOn(wikiService, 'getWikisByCategory')
        .mockResolvedValue(testEvents)
      const result = await await eventsResolver.wikiEventsByCategory(args)
      expect(result).toEqual(testEvents)
      expect(wikiService.getWikisByCategory).toHaveBeenCalledWith(
        {
          category: args.category,
        },
        args,
      )
    })
  })
})
