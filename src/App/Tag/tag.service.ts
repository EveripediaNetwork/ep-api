import { DataSource, Repository } from 'typeorm'
import { Injectable } from '@nestjs/common'
import Tag from '../../Database/Entities/tag.entity'
import PaginationArgs from '../pagination.args'
import { ArgsById } from '../utils/queryHelpers'
import TagIDArgs from './tag.dto'
import { DateArgs } from '../Wiki/wikiStats.dto'

@Injectable()
class TagService extends Repository<Tag> {
  constructor(dataSource: DataSource) {
    super(Tag, dataSource.createEntityManager())
  }

  async getTags(args: PaginationArgs): Promise<Tag[]> {
    return this.find({
      take: args.limit,
      skip: args.offset,
    })
  }

  async getTagById(args: ArgsById): Promise<Tag | null> {
    return this.createQueryBuilder('tag')
      .where('tag.id ILIKE :id', { id: `%${args.id}%` })
      .getOne()
  }

  async getTagsById(args: TagIDArgs): Promise<Tag[]> {
    return this.createQueryBuilder('tag')
      .where('LOWER(tag.id) LIKE :id', {
        id: `%${args.id.toLowerCase()}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('tag.id', 'DESC')
      .getMany()
  }

  async getTagsPopular(args: DateArgs): Promise<Tag | undefined> {
    return this.query(
      `
        SELECT "tagId" as id, COUNT(*) AS amount
        FROM public.wiki_tags_tag tags
        INNER JOIN wiki w ON w.id  = tags."wikiId"
        WHERE w.updated >= to_timestamp($1) AND w.updated <= to_timestamp($2)
        GROUP BY "tagId" 
        ORDER BY amount DESC 
        LIMIT 15       
        `,
      [args.startDate, args.endDate],
    )
  }
}

export default TagService
