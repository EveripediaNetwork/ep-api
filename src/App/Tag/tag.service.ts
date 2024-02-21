import { DataSource } from 'typeorm'
import { Injectable } from '@nestjs/common'
import Tag from '../../Database/Entities/tag.entity'
import PaginationArgs from '../pagination.args'
import TagIDArgs from './tag.dto'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { ArgsById } from '../general.args'
import TagRepository from './tag.repository'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from '../Wiki/wiki.service'

@Injectable()
class TagService {
  constructor(
    private dataSource: DataSource,
    private tagRepo: TagRepository,
    private wikiService: WikiService,
  ) {}

  async getTags(args: PaginationArgs): Promise<Tag[]> {
    return this.tagRepo.findTags(args)
  }

  async getTagById(args: ArgsById): Promise<Tag | null> {
    return this.tagRepo.findTagById(args)
  }

  async getTagsById(args: TagIDArgs): Promise<Tag[]> {
    return this.tagRepo.findTagsById(args)
  }

  async getTagsPopular(args: DateArgs): Promise<Tag | undefined> {
    return this.tagRepo.findTagsPopular(args)
  }

  async wikis(
    ids: string[],
    args: PaginationArgs,
    dates?: { start: string; end: string },
  ) {
    const repository = this.dataSource.getRepository(Wiki)

    let query = repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.tags', 'tag')
      .where('LOWER(tag.id) IN (:...tags)', {
        tags: ids.map((tag) => tag.toLowerCase()),
      })
      .andWhere('wiki.hidden = false')
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
    if (dates?.start && dates.end) {
      query = await this.wikiService.eventsFilter(query, dates, true)
    }
    return query.getMany()
  }
}

export default TagService
