import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import Category from '../../Database/Entities/category.entity'
import PaginationArgs from '../pagination.args'
import Wiki from '../../Database/Entities/wiki.entity'
import { ICategory } from '../../Database/Entities/types/ICategory'
import CategoryService from './category.service'
import { TitleArgs } from '../Wiki/wiki.dto'
import { ArgsById } from '../general.args'

// TODO: test Categories resolver
@Resolver(() => Category)
class CategoryResolver {
  constructor(
    private dataSource: DataSource,
    private categoryService: CategoryService,
  ) {}

  @Query(() => [Category])
  async categories(@Args() args: PaginationArgs) {
    return this.categoryService.getCategories(args)
  }

  @Query(() => Category, { nullable: true })
  async categoryById(@Args() args: ArgsById) {
    return this.categoryService.getCategoryById(args)
  }

  @ResolveField()
  async wikis(@Parent() category: ICategory, @Args() args: PaginationArgs) {
    const { id } = category
    const repository = this.dataSource.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .where('wiki.hidden = false')
      .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: id,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  @Query(() => [Category])
  async categoryByTitle(@Args() args: TitleArgs) {
    return this.categoryService.getCategoryByTitle(args)
  }
}

export default CategoryResolver
