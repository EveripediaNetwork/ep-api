import { Injectable } from '@nestjs/common'
import { Connection, MoreThan, Repository } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import { orderWikis, OrderBy, Direction } from './utils/queryHelpers'
import { ByIdArgs, CategoryArgs, LangArgs } from './wiki.dto'

@Injectable()
class WikiService {
  constructor(private connection: Connection) {}

  async repository(): Promise<Repository<Wiki>> {
    return this.connection.getRepository(Wiki)
  }

  async wikisIds() {
    return (await this.repository()).find({
      select: ['id', 'updated'],
      where: {
        hidden: false,
      },
    })
  }

  async findWiki(args: ByIdArgs): Promise<Wiki | undefined> {
    return (await this.repository()).findOne({
      where: {
        language: args.lang,
        id: args.id,
      },
    })
  }

  async getWikis(args: LangArgs): Promise<Wiki[] | []> {
    return (await this.repository()).find({
      where: {
        language: args.lang,
        hidden: false,
      },
      take: args.limit,
      skip: args.offset,
      order: orderWikis(args.order as OrderBy, args.direction as Direction),
    })
  }

  async getPromotedWikis(args: LangArgs): Promise<Wiki[] | []> {
    return (await this.repository()).find({
      where: {
        language: args.lang,
        promoted: MoreThan(0),
        hidden: false,
      },
      take: args.limit,
      skip: args.offset,
      order: {
        promoted: 'DESC',
      },
    })
  }

  async getWikisByCategory(args: CategoryArgs): Promise<Wiki[] | []> {
    return (await this.repository())
      .createQueryBuilder('wiki')
      .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: args.category,
      })
      .where('wiki.language = :lang AND hidden = :status', {
        lang: args.lang,
        status: false,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }
}

export default WikiService
