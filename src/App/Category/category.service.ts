/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { DataSource, MoreThan, Repository } from 'typeorm'
import Category from '../../Database/Entities/category.entity'
import PaginationArgs from '../pagination.args'
import { TitleArgs } from '../Wiki/wiki.dto'
import { ArgsById } from '../general.args'

@Injectable()
class CategoryService extends Repository<Category> {
  constructor(dataSource: DataSource) {
    super(Category, dataSource.createEntityManager())
  }

  async getCategoryIds(): Promise<Partial<Category>[]> {
    return this.find({
      select: ['id'],
      where: {
        weight: MoreThan(0),
      },
    })
  }

  async getCategories(args: PaginationArgs): Promise<Category[] | []> {
    return this.find({
      take: args.limit,
      skip: args.offset,
      where: {
        weight: MoreThan(0),
      },
      order: {
        weight: 'DESC',
      },
    })
  }

  async getCategoryById(args: ArgsById): Promise<Category | null> {
    return this.findOneBy({ id: args.id })
  }

  async getCategoryByTitle(args: TitleArgs): Promise<Category[] | []> {
    return this.createQueryBuilder()
      .where(
        '(LOWER(title) LIKE :title OR LOWER(id) LIKE :title) AND weight > 0',
        {
          title: `%${args.title.toLowerCase()}%`,
        },
      )
      .limit(10)
      .orderBy('weight', 'DESC')
      .getMany()
  }

  async wikiCategories(id: string) {
    return this.createQueryBuilder('cc')
      .innerJoin('wiki_categories_category', 'wc', 'wc.categoryId = cc.id')
      .where('wc.wikiId = :wikiId', { wikiId: 'metavsummit' })
      .getMany()
  }
}

export default CategoryService
