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
import { UseInterceptors } from '@nestjs/common'
import Category from '../Database/Entities/category.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { ICategory } from '../Database/Entities/types/ICategory'
import SentryInterceptor from '../sentry/security.interceptor'

@ArgsType()
class TitleArgs {
  @Field(() => String)
  @MinLength(3)
  title!: string
}

@UseInterceptors(SentryInterceptor)
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

  @Query(() => Category, { nullable: true })
  async categoryById(@Args('id', { type: () => String }) id: number) {
    const repository = this.connection.getRepository(Category)
    return repository.findOne(id)
  }

  @Query(() => [Category])
  async categoryByTitle(@Args() args: TitleArgs) {
    const repository = this.connection.getRepository(Category)
    return repository
      .createQueryBuilder()
      .where(
        '(LOWER(title) LIKE :title OR LOWER(id) LIKE :title) AND weight > 0',
        {
          title: `%${args.title.toLowerCase()}%`,
        },
      )
      .limit(10)
      .orderBy('weight', 'DESC')
      .getMany()
  }

  @ResolveField()
  async wikis(@Parent() category: ICategory, @Args() args: PaginationArgs) {
    const { id } = category
    const repository = this.connection.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .innerJoinAndSelect('wiki.tags', 'tag')
      .innerJoinAndSelect(
        'wiki.categories',
        'category',
        'category.id = :categoryId',
        {
          categoryId: id,
        },
      )
      .where('wiki.hidden = false')
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }
}

export default CategoryResolver
