import { Injectable } from '@nestjs/common'
import gql from 'graphql-tag'
import { DataSource } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import Category from '../../Database/Entities/category.entity'
import Language from '../../Database/Entities/language.entity'
import Tag from '../../Database/Entities/tag.entity'
import User from '../../Database/Entities/user.entity'
import { EventArgs, hasField } from './wiki.dto'
import WikiService from './wiki.service'
import { TranslationLanguage } from '../Translation/translation.dto'

@Injectable()
class EventsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly wikiService: WikiService,
  ) {}

  async events(ids: string[], args: EventArgs, count = false) {
    try {
      let blockchainFilter = ''
      if (args.blockchain) {
        blockchainFilter = `AND LOWER('${args.blockchain}') IN (
        SELECT json_array_elements_text("linkedWikis"->'blockchains')
      )`
      }

      let locationFilter = ''
      if (args.country && args.continent) {
        const country = `%${args.country}%`
        locationFilter = `AND events.country ILIKE '${country}' AND events.continent ILIKE ${args.continent} AND events.continent IS NOT NULL`
      } else if (args.country) {
        const country = `%${args.country}%`
        locationFilter = `AND events.country ILIKE '${country}'`
      } else if (args.continent) {
        locationFilter = `AND events.continent ILIKE '${args.continent}' AND events.continent IS NOT NULL`
      }

      const startDateOnly = `
            AND (
                events.date >= '${args.startDate}' 
                OR ('${args.startDate}' BETWEEN events."multiDateStart" AND events."multiDateEnd")
                OR (events."multiDateStart" >= '${args.startDate}')
            )
      `

      const startAndEndDate = `
        AND 
        CASE
            WHEN events.date IS NOT NULL THEN 
                events.date BETWEEN '${args.startDate}' AND '${args.endDate}' 
            ELSE 
                events."multiDateStart" <= '${args.endDate}' AND events."multiDateEnd" >= '${args.startDate}'
        END
      `

      let dateFilter

      if (!args.startDate) {
        dateFilter = ''
      }

      if (args.startDate && !args.endDate) {
        dateFilter = startDateOnly
      }

      if (args.endDate) {
        dateFilter = startAndEndDate
      }

      let eventsOrder = ''
      if (args.order === 'date') {
        eventsOrder = ` 
        ORDER BY 
        COALESCE(
            (SELECT MAX(COALESCE(events.date, events."multiDateStart", events."multiDateEnd"))
            FROM events 
            WHERE events."wikiId" = wiki.id
            ${dateFilter}
        ), '3099-01-01') ${args.direction} 
        `
      } else {
        eventsOrder = `ORDER BY ${args.order} ${args.direction}`
      }

      const oneTag = `
        AND LOWER(tag.id) = 'events'
      `

      const lowerCaseTagIds = ids.map((id) => id.toLowerCase())

      const formattedTagIds = `(${lowerCaseTagIds
        .map((id) => `'${id}'`)
        .join(', ')})`
      const multipleTags = `
        AND LOWER(tag.id) IN ${formattedTagIds}
      `

      const multipleTagsCheck = `
        HAVING COUNT(DISTINCT tag."id") > 1
      `

      const categoryFilter = args.category
        ? `
         INNER JOIN "wiki_categories_category" wc ON wc."wikiId"="wiki"."id" 
         INNER JOIN "category" "category" ON "category"."id" = wc."categoryId" AND (LOWER("category"."id") = LOWER('${args.category}')) 
      `
        : ''

      const titleFilter = args.title
        ? `
         AND LOWER("wiki"."title") LIKE LOWER('%${args.title}%')
      `
        : ''

      let events = await this.dataSource.getRepository(Wiki).query(
        `
            SELECT
            ${
              count
                ? 'COUNT(wiki.id) as amount'
                : `
            wiki.*,
            (
                SELECT JSON_AGG(events)
                FROM events 
                WHERE events."wikiId" = wiki.id
                ${dateFilter}
                ${locationFilter}
                ${blockchainFilter} 
            ) AS events
            `
            }
            FROM wiki
            INNER JOIN wiki_tags_tag AS wt ON wt."wikiId" = wiki.id
            INNER JOIN tag ON tag.id = wt."tagId"
            ${categoryFilter}
            WHERE wiki.hidden = ${args.hidden}
            ${titleFilter}
            AND EXISTS (
                SELECT 1
                FROM events 
                WHERE events."wikiId" = wiki.id
                ${dateFilter}
                ${locationFilter}
                ${blockchainFilter}
            )
            ${ids.length > 1 ? multipleTags : oneTag}
            ${count ? '' : ' GROUP BY wiki."id"'}
            ${ids.length > 1 ? multipleTagsCheck : ''}
            ${count ? '' : eventsOrder}
            ${count ? '' : `OFFSET ${args.offset} LIMIT ${args.limit}`}
        `,
      )

      if (args.lang === 'kr') {
        events = await this.wikiService.applyTranslations(
          events,
          TranslationLanguage.KOREAN,
        )
      }

      if (args.lang === 'zh') {
        events = await this.wikiService.applyTranslations(
          events,
          TranslationLanguage.CHINESE,
        )
      }
      return events
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
}

export default EventsService
