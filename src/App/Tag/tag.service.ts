import { DataSource } from 'typeorm'
import { Injectable } from '@nestjs/common'
import Tag from '../../Database/Entities/tag.entity'
import PaginationArgs from '../pagination.args'
import TagIDArgs from './tag.dto'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { ArgsById } from '../general.args'
import TagRepository from './tag.repository'
import Wiki from '../../Database/Entities/wiki.entity'

@Injectable()
class TagService {
  constructor(
    private dataSource: DataSource,
    private tagRepo: TagRepository,
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

  async wikis(id: string, args: PaginationArgs) {
    const repository = this.dataSource.getRepository(Wiki)
    return repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.tags', 'tag', 'tag.id ILIKE :tagId', {
        tagId: id,
      })
      .where('wiki.hidden = false')
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }
}

export default TagService
