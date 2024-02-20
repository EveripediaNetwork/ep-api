import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import PaginationArgs from '../pagination.args'
import TagIDArgs from './tag.dto'
import Tag from '../../Database/Entities/tag.entity'
import { ArgsById } from '../general.args'
import TagRepository from './tag.repository'

describe('TagRepository', () => {
  let repo: TagRepository

  let dataSource: {
    createEntityManager: jest.Mock
  }

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TagRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()

    repo = moduleRef.get<TagRepository>(TagRepository)
  })

  it('should be defined', () => {
    expect(repo).toBeDefined()
  })

  describe('findTags', () => {
    it('should get tags with pagination', async () => {
      const args: PaginationArgs = {
        offset: 0,
        limit: 10,
      }

      jest.spyOn(repo, 'find').mockResolvedValue([new Tag()])

      await repo.findTags(args)

      expect(repo.find).toHaveBeenCalledWith({
        take: args.limit,
        skip: args.offset,
      })
    })
  })

  describe('findTagById', () => {
    it('should get a tag by ID and wikis using the tag', async () => {
      const args: ArgsById = {
        id: '123',
      }

      const createQueryBuilder: any = {
        where: jest.fn().mockImplementation(() => createQueryBuilder),
        getOne: () => new Tag(),
      }

      jest
        .spyOn(repo, 'createQueryBuilder')
        .mockImplementation(() => createQueryBuilder)

      await repo.findTagById(args)

      expect(repo.createQueryBuilder).toHaveBeenCalled()
      expect(repo.createQueryBuilder().where).toHaveBeenCalledWith(
        'tag.id ILIKE :id',
        { id: args.id },
      )
    })
  })

  describe('findTagsById', () => {
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
        .spyOn(repo, 'createQueryBuilder')
        .mockImplementation(() => createQueryBuilder)

      await repo.findTagsById(args)

      expect(repo.createQueryBuilder).toHaveBeenCalled()
      expect(repo.createQueryBuilder().where).toHaveBeenCalledWith(
        'LOWER(tag.id) LIKE :id',
        { id: `%${args.id.toLowerCase()}%` },
      )
      expect(repo.createQueryBuilder).toHaveBeenCalledWith('tag')
      expect(repo.createQueryBuilder().orderBy).toHaveBeenCalledWith(
        'tag.id',
        'DESC',
      )
    })
  })
})
