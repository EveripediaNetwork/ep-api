import { Args, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Category from '../Database/Entities/category.entity'
import PaginationArgs from './pagination.args'

@Resolver(() => Category)
class CategoryResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Category])
  async categories(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(Category)
    return repository.find({
      take: args.limit,
      skip: args.offset,
    })
  }
  
  @Query(() => Category)
  async categoryById(@Args('id', { type: () => String }) id: number) {
    const repository = this.connection.getRepository(Category)
    return repository.findOneOrFail(id)
  }
}

export default CategoryResolver
