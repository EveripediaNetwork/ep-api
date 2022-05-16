import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Tag from '../Database/Entities/tag.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { ITag } from '../types/ITag'

@Resolver(() => Tag)
class TagResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Tag])
  async tags(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(Tag)
    return repository.find({
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => Tag)
  async tagById(@Args('id', { type: () => String }) id: number) {
    const repository = this.connection.getRepository(Tag)
    return repository.findOneOrFail(id)
  }

  @ResolveField()
  async wikis(@Parent() tag: ITag, @Args() args: PaginationArgs) {
    const { id } = tag
    const repository = this.connection.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.tags', 'tag', 'tag.id = :tagId', {
        tagId: id,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }
}

export default TagResolver
