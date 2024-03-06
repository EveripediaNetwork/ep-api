import { Test, TestingModule } from "@nestjs/testing"
import { HttpModule } from "@nestjs/axios"
import { CACHE_MANAGER } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { DataSource, EntityManager, Repository } from "typeorm"
import { ValidSlug } from "../utils/validSlug"
import DiscordWebhookService from "../utils/discordWebhookService"
import WikiService from "./wiki.service"
import EventsService from "./events.service"
import { EventArgs, EventsArgs, LangArgs } from "./wiki.dto"
import { Direction, OrderBy } from "../general.args"
import EventsResolver from "./events.resolver"
import WebhookHandler from "../utils/discordWebhookHandler"
import Wiki from "../../Database/Entities/wiki.entity"

describe("EventsResolver", () => {
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
        }
      ],
    }).compile();

    eventsResolver = module.get<EventsResolver>(EventsResolver)
    eventsService = module.get<EventsService>(EventsService)
    wikiService = module.get<WikiService>(WikiService)
  })

  describe("events", () => {
    it("should handle missing argument", async () => {
    const args: EventsArgs | EventArgs = {
      limit: 10,
      offset: 0,
      startDate: "2024-01-01",
      endDate: "2024-02-02",
      tagIds: ["tagId1", "tagId2", "tagId3"],
      lang: "en",
      hidden: false,
      direction: Direction.DESC,
      order: OrderBy.UPDATED,
    }
    const context = {
      req: { body: {} }
    }
    jest.spyOn(eventsService, "events").mockResolvedValue([])
    jest.spyOn(eventsService, "resolveWikiRelations").mockResolvedValue([])
    const result = await eventsResolver.events(args, context)
    expect(result).toEqual([])
    })
  })

  // describe("wikiEventsByCategory", () => {
  //   it("should return an array of events based on category", async () => {
  //     const args: EventArgs = {
  //       limit: 10,
  //       offset: 0,
  //       categoryId: "category_id",
  //       lang: 'en',
  //       hidden: false,
  //       direction: Direction.DESC,
  //       order: OrderBy.UPDATED,
  //     }

  //     const mockRepository = {
  //       createQueryBuilder: jest.fn().mockReturnThis(),
  //       innerJoin: jest.fn().mockReturnThis(),
  //       andWhere: jest.fn().mockReturnThis(),
  //       where: jest.fn().mockReturnThis(),
  //       limit: jest.fn().mockReturnThis(),
  //       offset: jest.fn().mockReturnThis(),
  //       orderBy: jest.fn().mockReturnThis(),
  //       getMany: jest.fn(),
  //     };

  //     jest.spyOn(wikiService, 'repository').mockResolvedValue(mockRepository as unknown as Repository<Wiki>);

  //     const expectedEvents: Wiki[] = []
  //     const result = await eventsResolver.wikiEventsByCategory(args)
  //     expect(result).toEqual(expectedEvents)
  //   })
  // })

  describe("popularEvents", () => {
    it("should return an array of popular events", async () => {
      jest.spyOn(wikiService, "getPopularEvents").mockResolvedValue([])
      const args: LangArgs = {
        lang: "en",
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      }
      const result = await eventsResolver.popularEvents(args)
      expect(result).toEqual([])
    })
  })
})