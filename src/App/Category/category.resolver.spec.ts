import { Test, TestingModule } from '@nestjs/testing'
import { HttpModule } from '@nestjs/axios'
import { CacheModule } from '@nestjs/cache-manager'
import { DataSource } from 'typeorm'
import { mockCacheStore } from '../utils/test-helpers/reuseableTestObjects'
import { getProviders, ProviderEnum } from '../utils/test-helpers/testHelpers'
import PaginationArgs from '../pagination.args'
import CategoryResolver from './category.resolver'
import CategoryService from './category.service'
import { ArgsById, Direction, OrderBy } from '../general.args'
import { TitleArgs } from '../Wiki/wiki.dto'
import Category from '../../Database/Entities/category.entity'

describe('CategoryResolver', () => {
  let resolver: CategoryResolver
  let service: CategoryService
  let moduleRef: TestingModule
  let dataSource: {
    createEntityManager: jest.Mock
    getRepository: jest.Mock
  }

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  }

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    find: jest.fn(),
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
      getRepository: jest.fn().mockReturnValue(mockRepository),
    }

    moduleRef = await Test.createTestingModule({
      imports: [HttpModule, CacheModule.register({ store: mockCacheStore })],
      providers: [
        CategoryResolver,
        CategoryService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        ...getProviders([
          ProviderEnum.categoryResolver,
          ProviderEnum.categoryService,
        ]),
      ],
    }).compile()

    resolver = moduleRef.get<CategoryResolver>(CategoryResolver)
    service = moduleRef.get<CategoryService>(CategoryService)
  })

  it('should be defined', () => {
    expect(resolver).toBeDefined()
  })

  describe('categories query', () => {
    it('should return all existing categories', async () => {
      const categories = [
        {
          id: 'organizations',
          title: 'Organizations',
          description: 'Organizations category description',
          cardImage: 'https://example.com/org-card.png',
          heroImage: 'https://example.com/org-hero.png',
          icon: 'organization-icon',
          weight: 100,
          wikis: [],
        },
        {
          id: 'dapps',
          title: 'Dapps',
          description: 'Dapps category description',
          cardImage: 'https://example.com/dapps-card.png',
          heroImage: 'https://example.com/dapps-hero.png',
          icon: 'dapps-icon',
          weight: 90,
          wikis: [],
        },
      ]

      jest
        .spyOn(service, 'getCategories')
        .mockResolvedValue(categories as Category[])

      const paginationArgs = new PaginationArgs()
      paginationArgs.limit = 10
      paginationArgs.offset = 0

      const result = await resolver.categories(paginationArgs)

      expect(result).toEqual(categories)
      expect(service.getCategories).toHaveBeenCalledWith(paginationArgs)
    })
  })

  describe('categoryById query', () => {
    it('should return a category with wikis having the search category id', async () => {
      const category = new Category()
      category.id = 'dapps'
      category.title = 'Dapps'
      category.description = 'Dapps category description'
      category.cardImage = 'https://example.com/dapps-card.png'
      category.heroImage = 'https://example.com/dapps-hero.png'
      category.icon = 'dapps-icon'
      category.weight = 90
      category.wikis = []

      jest.spyOn(service, 'getCategoryById').mockResolvedValue(category)

      const args: ArgsById = { id: 'dapps' }
      const result = await resolver.categoryById(args)

      expect(result).toBe(category)
      expect(service.getCategoryById).toHaveBeenCalledWith(args)
    })

    it('should return null when category id does not exist', async () => {
      jest.spyOn(service, 'getCategoryById').mockResolvedValue(null)

      const args: ArgsById = { id: 'non-existent-category' }
      const result = await resolver.categoryById(args)

      expect(result).toBeNull()
      expect(service.getCategoryById).toHaveBeenCalledWith(args)
    })
  })

  describe('categoryByTitle query', () => {
    it('should return categories matching the title query', async () => {
      const categories = [
        {
          id: 'defi',
          title: 'DeFi',
          description: 'DeFi category description',
          cardImage: 'https://example.com/defi-card.png',
          heroImage: 'https://example.com/defi-hero.png',
          icon: 'defi-icon',
          weight: 70,
          wikis: [],
        },
      ]

      jest
        .spyOn(service, 'getCategoryByTitle')
        .mockResolvedValue(categories as Category[])

      const titleArgs: TitleArgs = {
        title: 'crypto',
        lang: 'en',
        direction: Direction.ASC,
        order: OrderBy.ID,
        hidden: false,
        limit: 10,
        offset: 0,
      }

      const result = await resolver.categoryByTitle(titleArgs)

      expect(result).toEqual(categories)
      expect(service.getCategoryByTitle).toHaveBeenCalledWith(titleArgs)
    })

    it('should return an empty array when no categories match', async () => {
      jest.spyOn(service, 'getCategoryByTitle').mockResolvedValue([])

      const titleArgs: TitleArgs = {
        title: 'nonexistentcategory',
        lang: 'en',
        direction: Direction.ASC,
        order: OrderBy.ID,
        hidden: false,
        limit: 10,
        offset: 0,
      }

      const result = await resolver.categoryByTitle(titleArgs)

      expect(result).toEqual([])
      expect(service.getCategoryByTitle).toHaveBeenCalledWith(titleArgs)
    })

    it('should handle partial title matches', async () => {
      const categories = [
        {
          id: 'nfts',
          title: 'NFTs',
          description: 'NFTs category description',
          cardImage: 'https://example.com/nfts-card.png',
          heroImage: 'https://example.com/nfts-hero.png',
          icon: 'nfts-icon',
          weight: 80,
          wikis: [],
        },
      ]

      jest
        .spyOn(service, 'getCategoryByTitle')
        .mockResolvedValue(categories as Category[])

      const titleArgs: TitleArgs = {
        title: 'nft',
        lang: 'en',
        direction: Direction.ASC,
        order: OrderBy.ID,
        hidden: false,
        limit: 10,
        offset: 0,
      }

      const result = await resolver.categoryByTitle(titleArgs)

      expect(result).toEqual(categories)
      expect(service.getCategoryByTitle).toHaveBeenCalledWith(titleArgs)
    })

    it('should be case insensitive', async () => {
      const categories = [
        {
          id: 'daos',
          title: 'DAOs',
          description: 'DAOs category description',
          cardImage: 'https://example.com/daos-card.png',
          heroImage: 'https://example.com/daos-hero.png',
          icon: 'daos-icon',
          weight: 30,
          wikis: [],
        },
      ]

      jest
        .spyOn(service, 'getCategoryByTitle')
        .mockResolvedValue(categories as Category[])

      const titleArgs: TitleArgs = {
        title: 'DAO',
        lang: 'en',
        direction: Direction.ASC,
        order: OrderBy.ID,
        hidden: false,
        limit: 10,
        offset: 0,
      }

      const result = await resolver.categoryByTitle(titleArgs)

      expect(result).toEqual(categories)
      expect(service.getCategoryByTitle).toHaveBeenCalledWith(titleArgs)
    })
  })

  describe('wikis field resolver', () => {
    it('should return wikis for a given category', async () => {
      const category = {
        id: 'defi',
        title: 'DeFi',
        description: '',
        cardImage: '',
        heroImage: '',
        icon: '',
        wikis: [],
        weight: 70,
      }
      const paginationArgs = new PaginationArgs()
      paginationArgs.limit = 5
      paginationArgs.offset = 0

      const mockWikis = [
        { id: 'uniswap', title: 'Uniswap' },
        { id: 'aave', title: 'Aave' },
        { id: 'compound', title: 'Compound' },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockWikis)

      const result = await resolver.wikis(category, paginationArgs)

      expect(result).toEqual(mockWikis)
      expect(dataSource.getRepository).toHaveBeenCalled()
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('wiki')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('wiki.hidden = false')
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'wiki.categories',
        'category',
        'category.id = :categoryId',
        { categoryId: category.id },
      )
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(paginationArgs.limit)
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(
        paginationArgs.offset,
      )
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'wiki.updated',
        'DESC',
      )
      expect(mockQueryBuilder.getMany).toHaveBeenCalled()
    })

    it('should handle pagination correctly for wikis', async () => {
      const category = {
        id: 'nfts',
        title: 'NFTs',
        description: '',
        cardImage: '',
        heroImage: '',
        icon: '',
        wikis: [],
        weight: 80,
      }
      const paginationArgs = new PaginationArgs()
      paginationArgs.limit = 2
      paginationArgs.offset = 2

      const mockWikis = [
        { id: 'opensea', title: 'OpenSea' },
        { id: 'rarible', title: 'Rarible' },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockWikis)

      const result = await resolver.wikis(category, paginationArgs)

      expect(result).toEqual(mockWikis)
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(paginationArgs.limit)
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(
        paginationArgs.offset,
      )
    })

    it('should return empty array when no wikis found for category', async () => {
      const category = {
        id: 'new-category',
        title: 'New Category',
        description: '',
        cardImage: '',
        heroImage: '',
        icon: '',
        wikis: [],
        weight: 0,
      }
      const paginationArgs = new PaginationArgs()

      mockQueryBuilder.getMany.mockResolvedValue([])

      const result = await resolver.wikis(category, paginationArgs)

      expect(result).toEqual([])
    })

    it('should order wikis by updated date in descending order', async () => {
      const category = {
        id: 'defi',
        title: 'DeFi',
        description: '',
        cardImage: '',
        heroImage: '',
        icon: '',
        wikis: [],
        weight: 70,
      }
      const paginationArgs = new PaginationArgs()

      await resolver.wikis(category, paginationArgs)

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'wiki.updated',
        'DESC',
      )
    })

    it('should filter out hidden wikis', async () => {
      const category = {
        id: 'defi',
        title: 'DeFi',
        description: '',
        cardImage: '',
        heroImage: '',
        icon: '',
        wikis: [],
        weight: 70,
      }
      const paginationArgs = new PaginationArgs()

      await resolver.wikis(category, paginationArgs)

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('wiki.hidden = false')
    })
  })
})
