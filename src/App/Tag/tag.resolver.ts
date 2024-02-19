import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import Tag from '../../Database/Entities/tag.entity'
import PaginationArgs from '../pagination.args'
import { ITag } from '../../Database/Entities/types/ITag'
import TagService from './tag.service'
import TagIDArgs from './tag.dto'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { ArgsById } from '../general.args'

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
    return this.service.wikis([id], args)
  }
}

export default TagResolver
