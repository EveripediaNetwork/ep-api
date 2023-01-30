import { Injectable } from '@nestjs/common'
import { Connection, MoreThan, Repository } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import { orderWikis, OrderBy, Direction } from './utils/queryHelpers'
import { ValidSlug, Valid, Slug } from './utils/validSlug'
import {
  ByIdArgs,
  CategoryArgs,
  LangArgs,
  PromoteWikiArgs,
  TitleArgs,
} from './wiki.dto'

@Injectable()
class WikiService {
  constructor(private connection: Connection, private validSlug: ValidSlug) {}

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
      cache: 10000,
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

  async getWikisByTitle(args: TitleArgs): Promise<Wiki[] | []> {
    return (await this.repository())
      .createQueryBuilder('wiki')
      .where(
        'wiki.language = :lang AND LOWER(wiki.title) LIKE :title AND hidden = :hidden',
        {
          lang: args.lang,
          hidden: args.hidden,
          title: `%${args.title.replace(/[\W_]+/g, '%').toLowerCase()}%`,
        },
      )
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  async getValidWikiSlug(args: ByIdArgs): Promise<Slug | Valid> {
    const slugs = (await (
      await this.repository()
    )
      .createQueryBuilder('wiki')
      .where('LOWER(wiki.id) LIKE :id AND hidden =  :status', {
        lang: args.lang,
        status: true,
        id: `%${args.id.toLowerCase()}%`,
      })
      .orderBy('wiki.created', 'DESC')
      .getMany()) as unknown as Wiki[]
    return this.validSlug.validateSlug(slugs[0]?.id)
  }

  async getWikisHidden(args: LangArgs): Promise<Wiki[] | []> {
    return (await this.repository()).find({
      where: {
        language: args.lang,
        hidden: true,
      },
      take: args.limit,
      skip: args.offset,
      order: {
        updated: 'DESC',
      },
    })
  }

  async promoteWiki(args: PromoteWikiArgs): Promise<Wiki | undefined> {
    const wiki = (await this.repository()).findOne(args.id)
    await (await this.repository())
      .createQueryBuilder()
      .update(Wiki)
      .set({ promoted: args.level })
      .where('id = :id', { id: args.id })
      .execute()
    return wiki
  }

  async hideWiki(args: ByIdArgs): Promise<Wiki | undefined> {
    const wiki = (await this.repository()).findOne(args.id)
    await (await this.repository())
      .createQueryBuilder()
      .update(Wiki)
      .set({ hidden: true, promoted: 0 })
      .where('id = :id', { id: args.id })
      .execute()
    return wiki
  }

  async unhideWiki(args: ByIdArgs): Promise<Wiki | undefined> {
    const wiki = (await this.repository()).findOne(args.id)
    await (await this.repository())
      .createQueryBuilder()
      .update(Wiki)
      .set({ hidden: false })
      .where('id = :id', { id: args.id })
      .execute()
    return wiki
  }
}

export default WikiService
