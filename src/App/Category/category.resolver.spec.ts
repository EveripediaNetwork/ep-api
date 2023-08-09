import { HttpModule } from '@nestjs/axios'
import { CacheModule } from '@nestjs/common'
import { TestingModule, Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { getMockRes } from '@jest-mock/express'
import { mockCacheStore } from '../utils/test-helpers/reuseableTestObjects'
import { getProviders, ProviderEnum } from '../utils/test-helpers/testHelpers'
import PaginationArgs from '../pagination.args'
import CategoryResolver from './category.resolver'
import CategoryService from './category.service'

describe('CategoryResolver', () => {
  let resolver: CategoryResolver
  let service: CategoryService
  let moduleRef: TestingModule
  let dataSource: {
    createEntityManager: jest.Mock
  }
  const categoriesResult: any = getMockRes({
    data: {
      categoryById: {
        id: 'dapps',
        wikis: [
          {
            id: 'lenster',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'layerzero',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'certik',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'alchemy',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'yaxis',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'nym-protocol',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'iq-oraqles',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'bubblemaps',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
          {
            id: 'looksrare',
            categories: [
              {
                id: 'dapps',
                title: 'Dapps',
              },
            ],
          },
        ],
      },
    },
  })
  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.register({
          ttl: 3600,
          store: mockCacheStore,
        }),
      ],
      providers: [
        ...getProviders([
          ProviderEnum.categoryResolver,
          ProviderEnum.categoryService,
        ]),
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()
    resolver = moduleRef.get<CategoryResolver>(CategoryResolver)
    service = moduleRef.get<CategoryService>(CategoryService)
  })

  it('should be defined', () => {
    expect(resolver).toBeDefined()
  })

  it('should return all exisiting categories', async () => {
    const categories: any = getMockRes({
      data: {
        categories: [
          {
            id: 'organizations',
          },
          {
            id: 'dapps',
          },
          {
            id: 'nfts',
          },
          {
            id: 'defi',
          },
          {
            id: 'exchanges',
          },
          {
            id: 'cryptocurrencies',
          },
          {
            id: 'people',
          },
          {
            id: 'daos',
          },
        ],
      },
    })
    jest.spyOn(service, 'getCategories').mockResolvedValue(categories)
    const result = await resolver.categories(new PaginationArgs())
    expect(result).toBe(categories)
    expect(categories.res.data.categories.length).toBe(8)
  })

  it('should return a category with wikis having the search category id', async () => {
    jest.spyOn(service, 'getCategoryById').mockResolvedValue(categoriesResult)
    const hasSearchedCategory = (wiki: any) =>
      wiki.categories.some(
        (category: { id: string }) => category.id === 'dapps',
      )
    const searchCategoryExists =
      categoriesResult.res.data.categoryById.wikis.every(hasSearchedCategory)
    expect(await resolver.categoryById({ id: 'dapps' })).toBe(categoriesResult)
    expect(searchCategoryExists).toBe(true)
  })

  it('should return a category with wikis having the search category title', async () => {
    jest.spyOn(service, 'getCategoryById').mockResolvedValue(categoriesResult)
    const hasSearchedCategory = (wiki: any) =>
      wiki.categories.some(
        (category: { title: string }) => category.title === 'Dapps',
      )
    const searchCategoryExists =
      categoriesResult.res.data.categoryById.wikis.every(hasSearchedCategory)
    expect(await resolver.categoryById({ id: 'dapps' })).toBe(categoriesResult)
    expect(searchCategoryExists).toBe(true)
  })
})
