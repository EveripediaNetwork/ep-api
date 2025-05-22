import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import { Logger } from '@nestjs/common'
import Category from '../../Database/Entities/category.entity'
import PaginationArgs from '../pagination.args'
import Wiki from '../../Database/Entities/wiki.entity'
import { ICategory } from '../../Database/Entities/types/ICategory'
import CategoryService from './category.service'
import { TitleArgs } from '../Wiki/wiki.dto'
import { ArgsById } from '../general.args'

@Resolver(() => Category)
class CategoryResolver {
  private readonly logger = new Logger(CategoryResolver.name)

  constructor(
    private dataSource: DataSource,
    private categoryService: CategoryService,
  ) {}

  @Query(() => [Category])
  async categories(@Args() args: PaginationArgs) {
    try {
      return await this.categoryService.getCategories(args)
    } catch (error) {
      this.logger.error('Failed to fetch categories', error)
      throw error
    }
  }

  @Query(() => Category, { nullable: true })
  async categoryById(@Args() args: ArgsById) {
    try {
      return await this.categoryService.getCategoryById(args)
    } catch (error) {
      this.logger.error(`Failed to fetch category by ID: ${args.id}`, error)
      throw error
    }
  }

  @ResolveField()
  async wikis(@Parent() category: ICategory, @Args() args: PaginationArgs) {
    try {
      const { id } = category
      const { limit, offset } = args

      if (!id) {
        this.logger.warn('Category ID is missing for wikis resolution')
        return []
      }

      if (limit < 0 || offset < 0) {
        throw new Error('Limit and offset must be non-negative')
      }

      this.logger.debug(`Fetching wikis for category: ${id}`)

      const repository = this.dataSource.getRepository(Wiki)

      return await repository
        .createQueryBuilder('wiki')
        .where('wiki.hidden = false')
        .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
          categoryId: id,
        })
        .limit(args.limit)
        .offset(args.offset)
        .orderBy('wiki.updated', 'DESC')
        .getMany()
    } catch (error) {
      this.logger.error(
        `Failed to fetch wikis for category: ${category.id}`,
        error,
      )
      throw error
    }
  }

  @Query(() => [Category])
  async categoryByTitle(@Args() args: TitleArgs) {
    try {
      return await this.categoryService.getCategoryByTitle(args)
    } catch (error) {
      this.logger.error(
        `Failed to fetch categories by title: ${args.title}`,
        error,
      )
      throw error
    }
  }
}

export default CategoryResolver
