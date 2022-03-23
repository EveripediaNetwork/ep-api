import {
  Args,
  ArgsType,
  Field,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Connection, MoreThan } from 'typeorm'
import { MinLength } from 'class-validator'
import Category from '../Database/Entities/category.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { ICategory } from '../Database/Entities/types/ICategory'

@ArgsType()
class TitleArgs {
  @Field(() => String)
  @MinLength(3)
  title!: string
}

@Resolver(() => Category)
class CategoryResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Category])
  async categories(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(Category)
    return repository.find({
      take: args.limit,
      skip: args.offset,
      where: {
        weight: MoreThan(0),
      },
      order: {
        weight: 'DESC',
      },
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

  @Query(() => [Category])
  async categoryByTitle(@Args() args: TitleArgs) {
    const repository = this.connection.getRepository(Category)

    return repository
      .createQueryBuilder()
      .where('LOWER(title) LIKE :title OR LOWER(id) LIKE :title', {
        title: `%${args.title.toLowerCase()}%`,
      })
      .limit(10)
      .orderBy('weight', 'DESC')
      .getMany()
  }
}

export default CategoryResolver
