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
  EventArgs,
  EventByCategoryArgs,
  EventByTitleArgs,
  EventDefaultArgs,
  LangArgs,
} from './wiki.dto'
import EventsResolver from './events.resolver'
import Wiki from '../../Database/Entities/wiki.entity'
import { Direction, OrderBy } from '../general.args'
import WebhookHandler from '../utils/discordWebhookHandler'
import { mockEvents, testEvents } from './testEventMock'

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
            getEventsByLocationOrBlockchain: jest.fn(),
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

  describe('wikiEventsByTitle', () => {
    it('should return events based on provided title', async () => {
      const title = 'blockchain'
      const args = {
        title,
      } as unknown as EventByTitleArgs
      const eventsByTitle = testEvents.filter((obj) =>
        obj.id.toLowerCase().includes('blockchain'),
      )

      jest
        .spyOn(wikiService, 'getWikisByTitle')
        .mockResolvedValueOnce(eventsByTitle as Wiki[])
      const result = await eventsResolver.wikiEventsByTitle(args)
      expect(result).toEqual(eventsByTitle)
      result.forEach((obj) => {
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
      const resultWithCategory = testEvents.map((e) => ({
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

      result.forEach((obj) => {
        expect(obj.categories).toBeDefined()
        expect(obj.categories[0].id).toBe('Cryptocurrencies')
      })
    })
  })

  describe('events', () => {
    it('should return an array of Wiki objects with events tag', async () => {
      jest.spyOn(eventsService, 'events').mockResolvedValue(testEvents)
      const args: EventArgs = {
        tagIds: ['tagId1', 'tagId2'],
        lang: 'en',
        offset: 0,
        limit: 10,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
        hidden: false,
      }
      const context = {
        req: {
          body: {
            query: 'query',
          },
        },
      }

      jest.spyOn(eventsService, 'events').mockResolvedValueOnce(testEvents)
      jest
        .spyOn(eventsService, 'resolveWikiRelations')
        .mockResolvedValueOnce(testEvents as Wiki[])

      const result = await eventsResolver.events(args, context)
      console.log('Resolver Result:', result)
      expect(eventsService.events).toHaveBeenCalledWith(
        ['events', 'tagId1', 'tagId2'],
        args,
      )
      expect(result).toEqual(testEvents)
      expect(eventsService.resolveWikiRelations).toHaveBeenCalledWith(
        testEvents,
        'query',
      )
    })
    it('should return each result with the events tag', async () => {
      const args: EventArgs = {
        tagIds: ['tagId1', 'tagId2'],
        lang: 'en',
        hidden: false,
        limit: 10,
        direction: Direction.DESC,
        offset: 0,
        order: OrderBy.UPDATED,
      }

      const context = {
        req: {
          body: {
            query: 'query',
          },
        },
      }

      jest
        .spyOn(eventsService, 'events')
        .mockResolvedValue(testEvents as Wiki[])
      jest
        .spyOn(eventsService, 'resolveWikiRelations')
        .mockResolvedValue(testEvents as Wiki[])
      const result = await eventsResolver.events(args, context)
      result.forEach((event) => {
        expect(event.tags.some((tag) => tag.id === 'Events')).toBe(true)
      })
    })
  })
  describe('popularEvents', () => {
    it('should return popular events for the given language', async () => {
      const args: LangArgs = {
        lang: 'en',
        order: OrderBy.UPDATED,
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
      }
      jest
        .spyOn(wikiService, 'getPopularEvents')
        .mockResolvedValue(mockEvents as Wiki[])
      const result = await eventsResolver.popularEvents(args)
      expect(wikiService.getPopularEvents).toHaveBeenCalledWith(args)
      expect(result).toEqual(mockEvents)
    })
    it('should return popular events in descending order of views', async () => {
      const args: LangArgs = {
        lang: 'en',
        offset: 0,
        direction: Direction.DESC,
        limit: 10,
        order: OrderBy.UPDATED,
      }

      const mockEventsWithViews = mockEvents
        .map((event) => ({
          ...event,
          views: event.views || 0,
        }))
        .sort((a, b) => b.views - a.views)

      jest
        .spyOn(wikiService, 'getPopularEvents')
        .mockResolvedValue(mockEventsWithViews as Wiki[])
      const result = await eventsResolver.popularEvents(args)

      expect(wikiService.getPopularEvents).toHaveBeenCalledWith(args)
      expect(result).toEqual(mockEventsWithViews)

      for (let i = 1; i < mockEventsWithViews.length; i++) {
        expect(mockEventsWithViews[i - 1].views || 0).toBeGreaterThanOrEqual(
          mockEventsWithViews[i].views || 0,
        )
      }
    })
    it('should return popular events for a certain time period', async () => {
      const args: EventDefaultArgs = {
        offset: 0,
        direction: Direction.DESC,
        limit: 10,
        hidden: false,
        order: OrderBy.UPDATED,
        startDate: '2024-01-01',
        lang: 'en',
        endDate: '2024-2-31',
      }
      jest
        .spyOn(wikiService, 'getPopularEvents')
        .mockResolvedValue(mockEvents as Wiki[])
      const result = await eventsResolver.popularEvents(args)
      expect(wikiService.getPopularEvents).toHaveBeenCalledWith(args)
      expect(result).toEqual(mockEvents)
    })
  })
})
