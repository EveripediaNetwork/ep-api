import { Test, TestingModule } from '@nestjs/testing'
import { HttpModule } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
 import { DataSource, EntityManager } from 'typeorm'
import { ValidSlug } from '../utils/validSlug'
import DiscordWebhookService from '../utils/discordWebhookService'
import WikiService from './wiki.service'
import EventsService from './events.service'
import { EventArgs, EventByCategoryArgs, EventByTitleArgs, LangArgs, TitleArgs, eventTag } from './wiki.dto'
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


  describe('wikiEventsByTitle', () => {
    it('should return events based on provided title', async () => {
      const args: TitleArgs = {
        title: 'Blockchain summit',
        limit: 10,
        offset: 0,
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      jest.spyOn(wikiService, 'getWikisByTitle').mockResolvedValueOnce(testEvents)
      const result = await eventsResolver.wikiEventsByTitle(args)
      expect(result).toEqual(testEvents)
    })

    it('should handle missing title',async () => {
      const args: TitleArgs = {
        title: 'Blockchain summit',
        limit: 10,
        offset: 0,
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      await expect(eventsResolver.wikiEventsByTitle(args)).rejects.toThrowError()
    })

    it('should throw an error when retrieval fails', async () => {
      const args: TitleArgs = {
        title: 'Blockchain summit',
        limit: 10,
        offset: 0,
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      jest.spyOn(wikiService, 'getWikisByTitle').mockRejectedValueOnce(new Error('Failed to retrieve events'))
      await expect(eventsResolver.wikiEventsByTitle(args)).rejects.toThrowError('Failed to retrieve events')
    })
  })

  describe('wikiEventsByCategory', () => {
    it('should return events based on provided category', async () => {
      const args: EventByCategoryArgs = {
        category: "ethereum",
        limit: 10,
        offset: 0,
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      jest.spyOn(wikiService, 'getWikisByCategory').mockResolvedValueOnce(testEvents)
      const result = await eventsResolver.wikiEventsByCategory(args)

      expect(result).toEqual(testEvents)
    })

    it('should handle missing category', async ()=> {
      const args: EventByCategoryArgs = {
        limit: 10,
        offset: 0,
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      await expect(eventsResolver.wikiEventsByCategory(args)).rejects.toThrowError()
    })

    it('should throw an error when retrieval fails', async () => {
      const args: EventByCategoryArgs = {
        category: "ethereum",
        limit: 10,
        offset: 0,
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      jest.spyOn(wikiService, 'getWikisByCategory').mockRejectedValueOnce(new Error('Failed to retrieve events'))
      await expect(eventsResolver.wikiEventsByCategory(args)).rejects.toThrowError('Failed to retrieve events')
    })
  })

  describe('popularEvents', () => {
    it('should return popular events based on provided language', async () => {
      const args: LangArgs = {
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      jest.spyOn(wikiService, 'getPopularEvents').mockResolvedValueOnce(testEvents)

      const result = await eventsResolver.popularEvents(args)

      expect(result).toEqual(testEvents)
    })

    it('should handle missing language', async () => {
      const args: LangArgs = {
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      await expect(eventsResolver.popularEvents(args)).rejects.toThrowError()
    })

    it('should throw an error when retrieval fails', async () => {
      const args: LangArgs = {
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      
      jest.spyOn(wikiService, 'getPopularEvents').mockRejectedValueOnce(new Error('Failed to retrieve popular events'))
      await expect(eventsResolver.popularEvents(args)).rejects.toThrowError('Failed to retrieve popular events')
    })
  })

  describe('events', () =>{
    it('should return events based on provided args', async () => {
      const args: EventArgs = {
        tagIds: ['tag1', 'tag2'],
        hidden: false,
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      const context = {
        req: {
          body: {}
        }
      }

      jest.spyOn(eventsService, 'events').mockResolvedValueOnce(testEvents)
      jest.spyOn(eventsService, 'resolveWikiRelations').mockReturnValueOnce(testEvents)

      const result = await eventsResolver.events(args, context)

      expect(result).toEqual(testEvents)
    })

    it('should handle missing arguments', async () =>{
      const context = {
        req: {
          body: {}
        }
      }

      await expect(eventsResolver.events(undefined, context)).rejects.toThrowError()
    })

    // it('should throw an error if relation resolution fails', async () => {
    //   const args: EventArgs = {
    //     tagIds: ['tag1', 'tag2'],
    //     hidden: false,
    //     lang: 'en',
    //     limit: 10,
    //     offset: 0,
    //     direction: Direction.DESC,
    //     order: OrderBy.UPDATED,
    //   }
    //   const context = {
    //     req: {
    //       body: {}
    //     }
    //   }

    //   jest.spyOn(eventsResolver, 'resolveWikiRelations').mockRejectedValueOnce(new Error('Failed to resolve wiki relations'))
    // })
  })
})
