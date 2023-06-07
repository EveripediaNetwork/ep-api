import { DataSource, Repository } from 'typeorm'
import { Injectable } from '@nestjs/common'
import Tag from '../../Database/Entities/tag.entity'
import PaginationArgs from '../pagination.args'
import { ArgsById } from '../utils/queryHelpers'
import TagIDArgs from './tag.dto'

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
    return this.findOneBy({ id: args.id })
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
}

export default TagService
