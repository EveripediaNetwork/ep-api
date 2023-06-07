import { DataSource } from 'typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import { dummyWiki } from '../utils/test-helpers/reuseableTestObjects'

import Category from '../../Database/Entities/category.entity'
import CategoryService from './category.service'
import { TitleArgs } from '../Wiki/wiki.dto'

describe('CategoryService', () => {
  let service: CategoryService
  let moduleRef: TestingModule

  let dataSource: {
    createEntityManager: jest.Mock
  }
  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }
    moduleRef = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()

    service = moduleRef.get<CategoryService>(CategoryService)
  })

  describe('getCategoryIds', () => {
    it('should return an array of partial category objects with only "id" field', async () => {
      const mockResult = [{ id: '1' }, { id: '2' }] as unknown as Category[]

      jest.spyOn(service, 'find').mockResolvedValue(mockResult)

      const result = await service.getCategoryIds()

      expect(result).toEqual(mockResult)
    })
  })

  describe('getCategoryById', () => {
    it('should return an array of partial category objects with only "id" field', async () => {
      // Create a mock result
      const mockResult = {
        id: 'organizations',
        title: 'Organizations',
        description:
          'The Organizatons category covers companies and other organizations that develop, implement, or utilize blockchain technology.',
        cardImage: 'https://iq.wiki/images/categories/organizations-card.png',
        heroImage:
          'https://lh3.googleusercontent.com/53VvMqm3sJn1rFjmo3irSeahA9mGuuwkHwWJhtE9f5xX3RvTC6bpIhxOkamv8SDZH96t9UqjeYbheqcQ3jkAGydPlzbwSTNonojCGg=h600',
        icon: 'BsFillPeopleFill',
        weight: 8,
        wikis: [
          {
            id: dummyWiki.id,
            title: dummyWiki.title,
          },
        ],
      }

      jest.spyOn(service, 'findOneBy').mockResolvedValue(mockResult as Category)

      const result = await service.getCategoryById({
        id: 'Organizations',
      })

      expect(result).toEqual(mockResult)
    })
  })

  describe('getCategories', () => {
    it('should return an array of Category objects', async () => {
      const mockResult = [new Category()]

      jest.spyOn(service, 'find').mockResolvedValue(mockResult)

      const result = await service.getCategories({
        limit: 10,
        offset: 0,
      })

      expect(result).toEqual(mockResult)
    })
  })

  describe('getCategoryByTitle', () => {
    it('should return an array of partial category objects with only "id" field', async () => {
      const mockResult = new Category()

      const createQueryBuilder: any = {
        where: () => createQueryBuilder,
        limit: () => createQueryBuilder,
        orderBy: () => createQueryBuilder,
        getMany: () => mockResult,
      }

      jest
        .spyOn(service, 'createQueryBuilder')
        .mockImplementation(() => createQueryBuilder)

      const result = await service.getCategoryByTitle({
        title: 'Organizations',
      } as TitleArgs)

      expect(result).toEqual(mockResult)
    })
  })
})
