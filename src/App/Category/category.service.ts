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
    //  `
    // SELECT
    // "categories"."id" AS "categories_id",
    // "categories"."title" AS "categories_title",
    // "categories"."description" AS "categories_description",
    // "categories"."cardImage" AS "categories_cardImage",
    // "categories"."heroImage" AS "categories_heroImage",
    // "categories"."icon" AS "categories_icon",
    // "categories"."weight" AS "categories_weight"
    // FROM "category" "categories"
    // INNER JOIN "wiki_categories_category" "wiki_categories_category"
    // ON "wiki_categories_category"."wikiId" IN ($1)
    // AND "wiki_categories_category"."categoryId"="categories"."id"
    // ORDER BY "categories"."weight" DESC, "categories"."id" ASC
    // `
  }
}

export default CategoryService
