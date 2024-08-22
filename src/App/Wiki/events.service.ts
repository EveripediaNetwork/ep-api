import { Injectable } from '@nestjs/common'
import gql from 'graphql-tag'
import { DataSource, SelectQueryBuilder } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import Category from '../../Database/Entities/category.entity'
import Language from '../../Database/Entities/language.entity'
import Tag from '../../Database/Entities/tag.entity'
import User from '../../Database/Entities/user.entity'
import { EventArgs, eventTag, hasField } from './wiki.dto'
import WikiService from './wiki.service'

@Injectable()
class EventsService {
  constructor(
    private readonly dataSource: DataSource,
    private wikiService: WikiService,
  ) {}

  async events(ids: string[], args: EventArgs) {
    try {
      const repository = this.dataSource.getRepository(Wiki)
      const queryBuilder = repository
        .createQueryBuilder('wiki')
        .innerJoin('wiki.tags', 'tag')
        .leftJoinAndSelect('wiki.wikiEvents', 'wikiEvents')
        .where('subWiki.hidden = :hidden', { hidden: false })
        .limit(args.limit)
        .offset(args.offset)

      if (ids.length > 1) {
        queryBuilder.where(qb => {
          const subQuery = qb
            .subQuery()
            .select('subWiki.id')
            .from(Wiki, 'subWiki')
            .innerJoin('subWiki.tags', 'subTag')
            .where('LOWER(subTag.id) = ANY(:tagIds)', {
              tagIds: ids.map(tag => tag.toLowerCase()),
            })
            .andWhere('subWiki.hidden = :hidden', { hidden: false })
            .groupBy('subWiki.id')
            .having('COUNT(DISTINCT subTag.id) > 1')
            .getQuery()
          return `wiki.id IN ${subQuery}`
        })
      } else {
        queryBuilder.where('LOWER(tag.id) = LOWER(:ev)', { ev: eventTag })
      }

      this.wikiService.applyDateFilter(
        queryBuilder,
        args,
      ) as SelectQueryBuilder<Wiki>

      switch (args.order) {
        case 'date':
          this.wikiService.eventDateOrder(queryBuilder, args.direction)
          break

        case 'id':
          queryBuilder.orderBy('wiki.id', args.direction)
          break

        default:
          queryBuilder.orderBy(args.order, args.direction)
          break
      }

      return await queryBuilder.getMany()
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }

  async resolveWikiRelations(wikis: Wiki[], query: string): Promise<Wiki[]> {
    const ast = gql`
      ${query}
    `

    const isTagsFieldIncluded = hasField(ast, 'tags')
    const isCategoriesFieldIncluded = hasField(ast, 'categories')
    const isLanguageFieldIncluded = hasField(ast, 'language')
    const isUserFieldIncluded = hasField(ast, 'user')
    const isAuthorFieldIncluded = hasField(ast, 'author')

    for (const wiki of wikis) {
      if (isTagsFieldIncluded) {
        const tags = await this.wikiTags(wiki.id)
        wiki.tags = tags
      }
      if (isCategoriesFieldIncluded) {
        const category = await this.wikiCategories(wiki.id)
        wiki.categories = category
      }
      if (isLanguageFieldIncluded) {
        const language = await this.wikiLanguage(wiki.id)
        wiki.language = language as Language
      }
      if (isUserFieldIncluded) {
        const user = await this.wikiUser(wiki.id)
        wiki.user = user as User
      }
      if (isAuthorFieldIncluded) {
        const author = await this.wikiAuthor(wiki.id)
        wiki.author = author as User
      }
    }
    return wikis
  }

  async wikiLanguage(id: string) {
    const languageRepository = this.dataSource.getRepository(Language)

    const language = await languageRepository
      .createQueryBuilder('language')
      .innerJoin('Wiki', 'wiki', 'wiki.languageId = language.id')
      .where('wiki.id = :id', { id })
      .getOne()

    return language
  }

  async wikiTags(wikiId: string) {
    const repository = this.dataSource.getRepository(Tag)

    return repository
      .createQueryBuilder()
      .select('wiki_tag.tagId', 'id')
      .from('wiki_tags_tag', 'wiki_tag')
      .where('wiki_tag.wikiId = :id', { id: wikiId })
      .groupBy('wiki_tag.tagId')
      .getRawMany()
  }

  async wikiCategories(id: string) {
    const repository = this.dataSource.getRepository(Category)
    return repository
      .createQueryBuilder('cc')
      .innerJoin('wiki_categories_category', 'wc', 'wc.categoryId = cc.id')
      .where('wc.wikiId = :id', { id })
      .getMany()
  }

  async wikiUser(id: string) {
    return this.getUserDetails(id, 'wiki.userId = user.id', 'user')
  }

  async wikiAuthor(id: string) {
    return this.getUserDetails(id, 'wiki.authorId = author.id', 'author')
  }

  private async getUserDetails(id: string, condition: string, builder: string) {
    const userRepository = this.dataSource.getRepository(User)

    const userDetails = await userRepository
      .createQueryBuilder(builder)
      .innerJoin('wiki', 'wiki', condition)
      .leftJoinAndSelect(`${builder}.profile`, `${builder}_profile`)
      .where('wiki.id = :id', { id })
      .getOne()

    return userDetails
  }

  async getEventsByLocationOrBlockchain(args: any, blockchain = false) {
    const repository = this.dataSource.getRepository(Wiki)

    let queryBuilder = repository
      .createQueryBuilder('wiki')
      .leftJoinAndSelect('wiki.tags', 'tag')
      .leftJoinAndSelect('wiki.wikiEvents', 'wikiEvents')
      .where('wiki.hidden = false')
      .andWhere('LOWER(tag.id) = LOWER(:ev)', { ev: eventTag })
      .limit(args.limit)
      .offset(args.offset)

    if (args.order === 'date') {
      this.wikiService.eventDateOrder(queryBuilder, args.direction)
    } else {
      queryBuilder.orderBy(args.order, args.direction)
    }

    if (blockchain) {
      const sub = `LOWER(:blockchain) IN (
        SELECT json_array_elements_text("linkedWikis"->'blockchains')
      )`
      queryBuilder.andWhere(sub, {
        blockchain: args.blockchain,
      })
    } else {
      const conditions = []
      if (args.country) {
        conditions.push("elem->>'value' ILIKE '%' || :country || '%'")
      }
      if (args.continent) {
        conditions.push("elem->>'value' ILIKE '%' || :continent || '%'")
      }
      const subqueryCondition =
        conditions.length > 0 ? `AND (${conditions.join(' AND ')})` : ''

      const sub = `
            EXISTS (
                SELECT 1
                FROM jsonb_array_elements(metadata::jsonb) AS elem
                WHERE elem->>'id' = 'location' ${subqueryCondition}
            )
        `
      queryBuilder.andWhere(sub, {
        country: args.country,
        continent: args.continent,
      })
    }

    queryBuilder = this.wikiService.applyDateFilter(
      queryBuilder,
      args,
    ) as SelectQueryBuilder<Wiki>

    return queryBuilder.getMany()
  }
}

export default EventsService
