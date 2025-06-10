/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common'
import { DataSource, MoreThan, Repository } from 'typeorm'
import Category from '../../Database/Entities/category.entity'
import PaginationArgs from '../pagination.args'
import { TitleArgs } from '../Wiki/wiki.dto'
import { ArgsById } from '../general.args'

@Injectable()
class CategoryService extends Repository<Category> {
  private readonly logger = new Logger(CategoryService.name)

  constructor(dataSource: DataSource) {
    super(Category, dataSource.createEntityManager())
  }

  async getCategoryIds(): Promise<Partial<Category>[]> {
    try {
      return await this.find({
        select: ['id'],
        where: {
          weight: MoreThan(0),
        },
      })
    } catch (error) {
      this.logger.error('Failed to get category IDs', error)
      throw error
    }
  }

  async getCategories(args: PaginationArgs): Promise<Category[] | []> {
    try {
      const { limit, offset } = args

      if (limit < 0 || offset < 0) {
        throw new Error('Limit and offset must be non-negative')
      }

      return await this.find({
        take: args.limit,
        skip: args.offset,
        where: {
          weight: MoreThan(0),
        },
        order: {
          weight: 'DESC',
        },
      })
    } catch (error) {
      this.logger.error('Failed to get categories', error)
      throw error
    }
  }

  async getCategoryById(args: ArgsById): Promise<Category | null> {
    try {
      const { id } = args

      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error('Valid category ID is required')
      }

      return await this.findOneBy({ id: id.trim() })
    } catch (error) {
      this.logger.error(`Failed to get category by ID: ${args.id}`, error)
      throw error
    }
  }

  async getCategoryByTitle(args: TitleArgs): Promise<Category[] | []> {
    try {
      const { title } = args

      if (!title || typeof title !== 'string' || title.trim() === '') {
        return []
      }

      return await this.createQueryBuilder()
        .where(
          '(LOWER(title) LIKE :title OR LOWER(id) LIKE :title) AND weight > 0',
          {
            title: `%${args.title.toLowerCase()}%`,
          },
        )
        .limit(10)
        .orderBy('weight', 'DESC')
        .getMany()
    } catch (error) {
      this.logger.error(`Failed to get category by title: ${args.title}`, error)
      throw error
    }
  }
}

export default CategoryService
