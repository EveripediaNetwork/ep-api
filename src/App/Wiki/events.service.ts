import { Injectable } from '@nestjs/common'
import { ObjectType, Field, ID, GraphQLISODateTime, Int } from '@nestjs/graphql'
import gql from 'graphql-tag'
import { DataSource, Relation, Repository } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import Category from '../../Database/Entities/category.entity'
import Language from '../../Database/Entities/language.entity'
import Metadata from '../../Database/Entities/metadata.entity'
import Tag from '../../Database/Entities/tag.entity'
import Events from '../../Database/Entities/types/IEvents'
import LinkedWikis from '../../Database/Entities/types/ILinkedWikis'
import Media from '../../Database/Entities/types/IMedia'
import User from '../../Database/Entities/user.entity'
import Image from '../../Database/Entities/image.entity'
import PaginationArgs from '../pagination.args'
import { EventArgs, eventTag } from './wiki.dto'

@ObjectType()
export class EventObj {
  @Field(() => ID)
  id!: string

  @Field()
  title!: string

  @Field()
  hidden!: boolean

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  created!: Date

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  updated!: Date

  @Field(() => Int)
  block!: number

  @Field()
  transactionHash!: string

  @Field()
  ipfs!: string

  @Field(() => Int)
  version = 1

  @Field(() => Int, { nullable: true })
  views!: number

  @Field(() => Int, {
    nullable: true,
    defaultValue: 0,
  })
  visits?: number

  @Field(() => [Wiki], { nullable: true })
  founderWikis?: Wiki[]

  @Field(() => Int)
  promoted = 0

  @Field()
  content!: string

  @Field()
  summary!: string

  @Field(() => Language)
  language!: Language

  @Field(() => User)
  user!: User

  @Field(() => User, { nullable: true })
  author?: User

  @Field(() => [Metadata])
  metadata!: Metadata[]

  @Field(() => [Media], { nullable: true })
  media?: Media[]

  @Field(() => LinkedWikis, { nullable: true })
  linkedWikis?: LinkedWikis

  @Field(() => [Events], { nullable: true })
  events?: Events[]

  @Field(() => [Image])
  images!: Image[]

  @Field(() => [Tag], { nullable: true })
  tags!: Relation<Tag>[]

  @Field(() => [Category])
  categories!: Category[]
}

@Injectable()
class EventsService {
  constructor(private readonly dataSource: DataSource) {}

  async events(
    ids: string[],
    args: PaginationArgs,
    dates?: { start: string; end: string },
  ) {
    const repository = this.dataSource.getRepository(Wiki)

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
      .orderBy('wiki.updated', 'DESC')

    if (ids.length > 1) {
      return this.queryWikisWithMultipleTags(repository, ids, args, dates)
    }

    if (dates?.start && dates?.end && ids.length === 1) {
      queryBuilder.andWhere("wiki.events->0->>'date' BETWEEN :start AND :end", {
        start: dates.start,
        end: dates.end,
      })
    }

    return queryBuilder.getMany()
  }

  private async queryWikisWithMultipleTags(
    repository: Repository<Wiki>,
    ids: string[],
    args: PaginationArgs,
    dates?: { start: string; end: string },
  ) {
    const lowerCaseIds = ids.map((tag) => tag.toLowerCase())

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
      ORDER BY "subquery"."wikiCount" DESC
      OFFSET $3
      LIMIT $4`

    if (dates?.start && dates?.end) {
      mainQuery += `
      AND wiki.events->0->>'date' BETWEEN $5 AND $6`
      mainQuery += queryEnd

      return repository.query(mainQuery, [
        lowerCaseIds,
        eventTag,
        args.offset,
        args.limit,
        dates.start,
        dates.end,
      ])
    }

    mainQuery += queryEnd

    return repository.query(mainQuery, [
      lowerCaseIds,
      eventTag,
      args.offset,
      args.limit,
    ])
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

  async getEventsByBlockchain(args: EventArgs) {
    const repository = this.dataSource.getRepository(Wiki)
    const query = `
      SELECT *
      FROM wiki
      WHERE LOWER($1) IN (
        SELECT json_array_elements_text("linkedWikis"->'blockchains')
      )
      LIMIT $2
      OFFSET $3;
    `
    return repository.query(query, [args.blockchain, args.limit, args.offset])
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
