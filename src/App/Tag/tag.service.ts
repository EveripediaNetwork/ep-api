import { DataSource } from 'typeorm'
import { Injectable } from '@nestjs/common'
import Tag from '../../Database/Entities/tag.entity'
import PaginationArgs from '../pagination.args'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { ArgsById, BaseArgs } from '../general.args'
import TagRepository from './tag.repository'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiService from '../Wiki/wiki.service'
import { TranslationLanguage } from '../Translation/translation.dto'

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

  async getTagsById(args: ArgsById): Promise<Tag[]> {
    return this.tagRepo.findTagsById(args)
  }

  async getTagsPopular(args: DateArgs): Promise<Tag | undefined> {
    return this.tagRepo.findTagsPopular(args)
  }

  async wikis(id: string, args: BaseArgs) {
    const repository = this.dataSource.getRepository(Wiki)
    let wikis = await repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.tags', 'tag', 'tag.id ILIKE :tagId', {
        tagId: id,
      })
      .where('wiki.hidden = false')
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()

    if (args.lang === 'kr') {
      wikis = await this.wikiService.applyTranslations(
        wikis,
        TranslationLanguage.KOREAN,
      )
    }
    if (args.lang === 'zh') {
      wikis = await this.wikiService.applyTranslations(
        wikis,
        TranslationLanguage.CHINESE,
      )
    }
    return wikis
  }
}

export default TagService
