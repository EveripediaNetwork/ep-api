import { Args, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Tag from '../Database/Entities/tag.entity'
import PaginationArgs from './pagination.args'

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
}

export default TagResolver
