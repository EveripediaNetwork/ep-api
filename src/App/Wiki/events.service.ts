import { Injectable } from '@nestjs/common'
import gql from 'graphql-tag'
import { DataSource, Repository } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import Category from '../../Database/Entities/category.entity'
import Language from '../../Database/Entities/language.entity'
import Tag from '../../Database/Entities/tag.entity'
import User from '../../Database/Entities/user.entity'
import { EventArgs, EventByBlockchainArgs, eventTag } from './wiki.dto'

@Injectable()
class EventsService {
  constructor(private readonly dataSource: DataSource) {}

  async events(ids: string[], args: EventArgs) {
    const repository = this.dataSource.getRepository(Wiki)

    let order

    switch (args.order) {
      case 'date':
        order = "wiki.events->0->>'date'"
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
      .where('LOWER(tag.id) IN (:...tags)', {
        tags: ids.map((tag) => tag.toLowerCase()),
      })
      .andWhere('wiki.hidden = false')
      .andWhere('LOWER(tag.id) = LOWER(:ev)', { ev: eventTag })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy(order, args.direction)

    if (ids.length > 1) {
      return this.queryWikisWithMultipleTags(repository, ids, args)
    }

    if (args.startDate && !args.endDate && ids.length === 1) {
      queryBuilder.andWhere("wiki.events->0->>'date' >= :start", {
        start: args.startDate,
      })
    }

    if (args.startDate && args.endDate && ids.length === 1) {
      queryBuilder.andWhere("wiki.events->0->>'date' BETWEEN :start AND :end", {
        start: args.startDate,
        end: args.endDate,
      })
    }

    return queryBuilder.getMany()
  }

  private async queryWikisWithMultipleTags(
    repository: Repository<Wiki>,
    ids: string[],
    args: EventArgs,
  ) {
    const lowerCaseIds = ids.map((tag) => tag.toLowerCase())
    const order =
      args.order === 'date'
        ? `"subquery"."events"->0->>'date'`
        : `"subquery"."${args.order}"`
    let mainQuery = `
        SELECT "subquery".*
        FROM (
            SELECT
                "wiki".*,
                "tag"."id" AS "tagid",
                COUNT("wiki"."id") OVER (PARTITION BY "wiki"."id") AS "wikiCount"
            FROM "wiki" "wiki"
            INNER JOIN "wiki_tags_tag" "wiki_tag" ON "wiki_tag"."wikiId" = "wiki"."id"
            INNER JOIN "tag" "tag" ON "tag"."id" = "wiki_tag"."tagId"
            WHERE LOWER("tag"."id")  = ANY($1::text[]) AND "wiki"."hidden" = false
    `

    const queryEnd = `
    ) AS "subquery"
      WHERE LOWER("subquery"."tagid") = LOWER($2) and "subquery"."wikiCount" > 1
      ORDER BY ${order} ${args.direction}
      OFFSET $3
      LIMIT $4`

    const params = [
      lowerCaseIds,
      eventTag,
      args.offset,
      args.limit,
      args.startDate,
      args.endDate,
    ]

    if (args.startDate && args.endDate) {
      mainQuery += `
      AND wiki.events->0->>'date' BETWEEN $5 AND $6`
      mainQuery += queryEnd
      return repository.query(mainQuery, params)
    }

    if (args.startDate && !args.endDate) {
      mainQuery += `
      AND wiki.events->0->>'date' >= $5`
      mainQuery += queryEnd
      return repository.query(mainQuery, params.slice(0, -1))
    }

    mainQuery += queryEnd

    return repository.query(mainQuery, params.slice(0, -2))
  }

  async resolveWikiRelations(wikis: Wiki[], query: string): Promise<Wiki[]> {
    const ast = gql`
      ${query}
    `

    const isTagsFieldIncluded = this.hasField(ast, 'tags')
    const isCategoriesFieldIncluded = this.hasField(ast, 'categories')
    const isLanguageFieldIncluded = this.hasField(ast, 'language')
    const isUserFieldIncluded = this.hasField(ast, 'user')
    const isAuthorFieldIncluded = this.hasField(ast, 'author')

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

  async getEventsByBlockchain(args: EventByBlockchainArgs) {
    const repository = this.dataSource.getRepository(Wiki)
    const order =
      args.order === 'date'
        ? `wiki."events"->0->>'date'`
        : `wiki."${args.order}"`

    let params = [args.blockchain, args.limit, args.offset]
    let query = `
      SELECT *
      FROM wiki
      WHERE LOWER($1) IN (
        SELECT json_array_elements_text("linkedWikis"->'blockchains')
      )
    `

    if (args.startDate && !args.endDate) {
      query += `AND wiki.events->0->>'date' >= $4\n`
      params = [...params, args.startDate]
    }

    if (args.startDate && args.endDate) {
      query += `AND wiki.events->0->>'date' BETWEEN $4 AND $5\n`
      params = [...params, args.startDate, args.endDate]
    }

    query += `ORDER BY ${order} ${args.direction}
      LIMIT $2
      OFFSET $3`

    return repository.query(query, params)
  }

  hasField(ast: any, fieldName: string): boolean {
    let fieldExists = false

    function traverse(node: {
      kind: string
      name: { value: string }
      selectionSet: { selections: any[] }
    }) {
      if (node.kind === 'Field' && node.name.value === fieldName) {
        fieldExists = true
      }

      if (node.selectionSet) {
        node.selectionSet.selections.forEach(traverse)
      }
    }

    ast.definitions.forEach((definition: any) => {
      traverse(definition)
    })

    return fieldExists
  }
}

export default EventsService
