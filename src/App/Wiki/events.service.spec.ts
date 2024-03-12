import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import CategoryService from '../Category/category.service'
import TagService from '../Tag/tag.service'
import EventsService from './events.service'
import Wiki from '../../Database/Entities/wiki.entity'
import PaginationArgs from '../pagination.args'
import { eventTag } from './wiki.dto'

describe('EventsService', () => {
  let eventsService: EventsService

  const repository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
    query: jest.fn(),
  }

  const tagService = {
    wikiTags: jest.fn(),
  }

  const categoryService = {
    wikiCategories: jest.fn(),
  }

  const dataSource = {
    getRepository: jest.fn(() => repository),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: TagService,
          useValue: tagService,
        },
        {
          provide: CategoryService,
          useValue: categoryService,
        },
      ],
    }).compile()

    eventsService = module.get<EventsService>(EventsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('event', () => {
    it('should retrieve event with valid argument', async () => {
      //   tagService.wikiTags.mockReturnValue(55)
      //   const ids = ['id1', 'id2']
      //   const args: PaginationArgs = {
      //     limit: 10,
      //     offset: 0,
      //   }
      //   const dates = {
      //     start: '2024-01-01',
      //     end: '2024-02-02',
      //   }
      //   await eventsService.events(ids, args, dates)
      //   expect(dataSource.getRepository).toHaveBeenCalledWith(Wiki)
      //   expect(repository.createQueryBuilder).toHaveBeenCalledWith('wiki')
      //   expect(repository.query).toHaveBeenCalled()
    })

    it('should retrieve events with multiple IDs and date filtering', async () => {
      //   const ids = ['id1', 'id2']
      //   const args: PaginationArgs = {
      //     limit: 10,
      //     offset: 0,
      //   }
      //   const dates = {
      //     start: '2024-01-01',
      //     end: '2024-02-02',
      //   }
      //   await eventsService.events(ids, args, dates)
      //   expect(repository.createQueryBuilder).toHaveBeenCalledWith('wiki')
      //   expect(repository.query).toHaveBeenCalled()
      //   expect(repository.query).toHaveBeenCalledWith(expect.any(String), [
      //     ids.map((id) => id.toLocaleLowerCase()),
      //     eventTag,
      //     args.offset,
      //     args.limit,
      //     dates.start,
      //     dates.end,
      //   ])
    })
  })
})
