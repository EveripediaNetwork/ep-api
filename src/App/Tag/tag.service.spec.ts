import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import TagService from './tag.service'
import PaginationArgs from '../pagination.args'
import { ArgsById } from '../utils/queryHelpers'
import TagIDArgs from './tag.dto'
import Tag from '../../Database/Entities/tag.entity'

describe('TagService', () => {
  let service: TagService

  let dataSource: {
    createEntityManager: jest.Mock
  }

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()

    service = moduleRef.get<TagService>(TagService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getTags', () => {
    it('should get tags with pagination', async () => {
      const args: PaginationArgs = {
        offset: 0,
        limit: 10,
      }

      jest.spyOn(service, 'find').mockResolvedValue([new Tag()])

      await service.getTags(args)

      expect(service.find).toHaveBeenCalledWith({
        take: args.limit,
        skip: args.offset,
      })
    })
  })

  describe('getTagById', () => {
    it('should get a tag by ID and wikis using the tag', async () => {
      const args: ArgsById = {
        id: '123',
      }

      const createQueryBuilder: any = {
        where: jest.fn().mockImplementation(() => createQueryBuilder),
        getOne: () => new Tag(),
      }

      jest
        .spyOn(service, 'createQueryBuilder')
        .mockImplementation(() => createQueryBuilder)

      await service.getTagById(args)

      expect(service.createQueryBuilder).toHaveBeenCalled()
      expect(service.createQueryBuilder().where).toHaveBeenCalledWith(
        'tag.id ILIKE :id',
        { id: args.id },
      )
    })
  })

  describe('getTagsById', () => {
    it('should get tags by ID with pagination', async () => {
      const args: TagIDArgs = {
        id: '123',
        offset: 0,
        limit: 10,
      }

      const createQueryBuilder: any = {
        where: jest.fn().mockImplementation(() => createQueryBuilder),
        limit: () => createQueryBuilder,
        offset: () => createQueryBuilder,
        orderBy: jest.fn().mockImplementation(() => createQueryBuilder),
        getMany: () => [new Tag()],
      }

      jest
        .spyOn(service, 'createQueryBuilder')
        .mockImplementation(() => createQueryBuilder)

      await service.getTagsById(args)

      expect(service.createQueryBuilder).toHaveBeenCalled()
      expect(service.createQueryBuilder().where).toHaveBeenCalledWith(
        'LOWER(tag.id) LIKE :id',
        { id: `%${args.id.toLowerCase()}%` },
      )
      expect(service.createQueryBuilder).toHaveBeenCalledWith('tag')
      expect(service.createQueryBuilder().orderBy).toHaveBeenCalledWith(
        'tag.id',
        'DESC',
      )
    })
  })
})
