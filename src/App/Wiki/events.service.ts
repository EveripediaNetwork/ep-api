import { Injectable } from '@nestjs/common'
import gql from 'graphql-tag'
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import Category from '../../Database/Entities/category.entity'
import Language from '../../Database/Entities/language.entity'
import Tag from '../../Database/Entities/tag.entity'
import User from '../../Database/Entities/user.entity'
import { EventArgs, eventTag, hasField } from './wiki.dto'
import WikiService from './wiki.service'

function nullFilter(arr: any[]) {
  return arr.filter((item: undefined) => item !== undefined)
}
@Injectable()
class EventsService {
  constructor(
    private readonly dataSource: DataSource,
    private wikiService: WikiService,
  ) {}

  async events(ids: string[], args: EventArgs) {
    try {
      const repository = this.dataSource.getRepository(Wiki)

      let order

      switch (args.order) {
        case 'date':
          order = this.wikiService.orderFuse(args.direction)
          break
        case 'id':
          order = 'wiki.id'
          break
        default:
          order = args.order
      }

      const queryBuilder = repository
        .createQueryBuilder('wiki')
        .leftJoinAndSelect('wiki.tags', 'tag')
        .leftJoinAndSelect('wiki.wikiEvents', 'wikiEvents')
        .where('LOWER(tag.id) IN (:...tags)', {
          tags: ids.map((tag) => tag.toLowerCase()),
        })
        .andWhere('wiki.hidden = false')
        .andWhere('LOWER(tag.id) = LOWER(:ev)', { ev: eventTag })
        .limit(args.limit)
        .offset(args.offset)
        .orderBy(order, args.direction)

      if (ids.length > 1) {
        return await this.queryWikisWithMultipleTags(repository, ids, args)
      }

      if (ids.length === 1) {
        this.wikiService.applyDateFilter(
          queryBuilder,
          args,
        ) as SelectQueryBuilder<Wiki>
      }

      return await queryBuilder.getMany()
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }

  private async queryWikisWithMultipleTags(
    repository: Repository<Wiki>,
    ids: string[],
    args: EventArgs,
  ) {
    const lowerCaseIds = ids.map((tag) => tag.toLowerCase())

    const order =
      args.order === 'date'
        ? this.wikiService.orderFuse(args.direction)
        : `"subquery"."${args.order}"`

    let mainQuery = `
        SELECT "subquery".*
        FROM (
            SELECT
                "wiki".*,
                "wikiEvents".*,
                "tag"."id" AS "tagid",
                COUNT("wiki"."id") OVER (PARTITION BY "wiki"."id") AS "wikiCount"
            FROM "wiki" "wiki"
            INNER JOIN "wiki_tags_tag" "wiki_tag" ON "wiki_tag"."wikiId" = "wiki"."id"
            INNER JOIN "tag" "tag" ON "tag"."id" = "wiki_tag"."tagId"
            WHERE LOWER("tag"."id")  = ANY($1::text[]) AND "wiki"."hidden" = false
        ) AS "subquery"
        LEFT JOIN "events" "wikiEvents" ON "wikiEvents"."wikiId" = "subquery"."id"
    `

    const queryEnd = `
      WHERE LOWER("subquery"."tagid") = LOWER($2) and "subquery"."wikiCount" > 1
      ORDER BY ${order} ${args.direction}
      OFFSET $3
      LIMIT $4`

    const params = nullFilter([
      lowerCaseIds,
      eventTag,
      args.offset,
      args.limit,
      args.startDate,
      args.endDate,
    ])

    mainQuery = !args.startDate
      ? (this.wikiService.applyDateFilter(mainQuery, args, params) as string)
      : (mainQuery += this.wikiService.applyDateFilter(
          mainQuery,
          args,
          params,
        ) as string)
    mainQuery += queryEnd

    return repository.query(mainQuery, params)
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
    // TODO: events order fuse, join wikievents
    const order =
      args.order === 'date'
        ? this.wikiService.orderFuse(args.direction)
        : `wiki."${args.order}"`

    let queryBuilder = repository
      .createQueryBuilder('wiki')
      .leftJoinAndSelect('wiki.tags', 'tag')
      .where('wiki.hidden = false')
      .andWhere('LOWER(tag.id) = LOWER(:ev)', { ev: eventTag })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy(order, args.direction)

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
