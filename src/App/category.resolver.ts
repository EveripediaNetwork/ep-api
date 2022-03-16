import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Category from '../Database/Entities/category.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { ICategory } from '../Database/Entities/types/ICategory'

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

  // TODO: add pagination
  @ResolveField()
  async wikis(@Parent() category: ICategory) {
    const { id } = category
    const repository = this.connection.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: id,
      })
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }
}

export default CategoryResolver
