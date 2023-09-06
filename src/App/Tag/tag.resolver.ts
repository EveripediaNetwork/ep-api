import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import Tag from '../../Database/Entities/tag.entity'
import PaginationArgs from '../pagination.args'
import Wiki from '../../Database/Entities/wiki.entity'
import { ITag } from '../../Database/Entities/types/ITag'
import { ArgsById } from '../utils/queryHelpers'
import TagService from './tag.service'
import TagIDArgs from './tag.dto'
import { DateArgs } from '../Wiki/wikiStats.dto'

@Resolver(() => Tag)
class TagResolver {
  constructor(private dataSource: DataSource, private service: TagService) {}

  @Query(() => [Tag])
  async tags(@Args() args: PaginationArgs) {
    return this.service.getTags(args)
  }

  @Query(() => Tag, { nullable: true })
  async tagById(@Args() args: ArgsById) {
    return this.service.getTagById(args)
  }

  @Query(() => [Tag])
  async tagsById(@Args() args: TagIDArgs) {
    return this.service.getTagsById(args)
  }

  @Query(() => [Tag])
  async tagsPopular(@Args() args: DateArgs) {
    return this.service.getTagsPopular(args)
  }

  @ResolveField()
  async wikis(@Parent() tag: ITag, @Args() args: PaginationArgs) {
    const { id } = tag
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

export default TagResolver
