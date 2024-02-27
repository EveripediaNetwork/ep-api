import { Test, TestingModule } from '@nestjs/testing'
import EventsResolver from './events.resolver'
import WikiService from './wiki.service'
import TagService from '../Tag/tag.service'
import Wiki from '../../Database/Entities/wiki.entity'
import { EventArgs, LangArgs, NearByEventsArgs } from './wiki.dto'
import { Direction, OrderBy } from '../general.args'

describe('EventsResolver', () => {
  let eventsResolver: EventsResolver
  let wikiService: WikiService
  let tagService: TagService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsResolver,
        {
          provide: WikiService,
          useValue: {
            getWikisByCategory: jest.fn().mockResolvedValue([]),
            getWikisByTitle: jest.fn().mockResolvedValue([]),
            getPopularEvents: jest.fn().mockResolvedValue([]),
            getNearbyEvents: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: TagService,
          useValue: {
            wikis: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile()

    eventsResolver = module.get<EventsResolver>(EventsResolver)
    wikiService = module.get<WikiService>(WikiService)
    tagService = module.get<TagService>(TagService)
  })

  describe('events', () => {
    it('should return an array of events', async () => {
      const args: EventArgs = {
        limit: 10,
        offset: 0,
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        ids: ['id1', 'id2', 'id3'],
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      const expectedEvents: Wiki[] = []

      jest.spyOn(tagService, 'wikis').mockResolvedValue(expectedEvents)

      const result = await eventsResolver.events(args)

      expect(result).toEqual(expectedEvents)
    })

    it('should handle missing argument', async () => {
      const args: EventArgs = {
        limit: 10,
        offset: 0,
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        ids: ['id1', 'id2', 'id3'],
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      const result = await eventsResolver.events(args)
      expect(result).toEqual([])
    })
  })

  describe('wikiEventsByCategory' || 'wikiEventsByTitle', () => {
    it('should return an array of events based on category or title', async () => {
      const args: EventArgs = {
        limit: 10,
        offset: 0,
        categoryId: 'category_id' || 'event_title',
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      const expectedEvents: Wiki[] = []

      const result = await eventsResolver.wikiEventsByCategory(args)

      expect(result).toEqual(expectedEvents)
    })

    it('should handle missing arguments', async () => {
      const args: EventArgs = {
        limit: 10,
        offset: 0,
        categoryId: 'category_id',
        lang: 'en',
        hidden: false,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      const result = await eventsResolver.wikiEventsByCategory(args)
      expect(result).toEqual([])
    })
  })

  describe('popularEvents', () => {
    it('should return an array of popular events', async () => {
      const args: LangArgs = {
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }

      const expectedEvents: Wiki[] = []

      jest
        .spyOn(wikiService, 'getPopularEvents')
        .mockResolvedValue(expectedEvents)

      const result = await eventsResolver.popularEvents(args)

      expect(result).toEqual(expectedEvents)
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('nearbyEvents', () => {
    it('should return nearby events', async () => {
      const args: NearByEventsArgs = {
        latitude: 6.5323,
        longitude: 3.3526,
        maxDistance: 10,
        offset: 0,
      }

      const expectedEvents: Wiki[] = []

      jest
        .spyOn(wikiService, 'getNearbyEvents')
        .mockResolvedValue(expectedEvents)

      const result = await eventsResolver.nearbyEvents(args)
      expect(result).toEqual(expectedEvents)
    })

    it('should not include events beyond the maximum distance', async () => {
      const args: NearByEventsArgs = {
        latitude: 6.5323,
        longitude: 3.3526,
        maxDistance: 1,
        offset: 0,
      }
      const expectedEvents: Wiki[] = []

      jest
        .spyOn(wikiService, 'getNearbyEvents')
        .mockResolvedValue(expectedEvents)

      const result = await eventsResolver.nearbyEvents(args)
      expect(result).toEqual([])
    })
  })
})
