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
import { MinLength, Validate } from 'class-validator'
import { UseInterceptors } from '@nestjs/common'
import Category from '../Database/Entities/category.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { ICategory } from '../Database/Entities/types/ICategory'
import SentryInterceptor from '../sentry/security.interceptor'
import ValidStringParams from './utils/customValidator'

@ArgsType()
class TitleArgs {
  @Field(() => String)
  @MinLength(3)
  @Validate(ValidStringParams)
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

  @ResolveField()
  async wikis(@Parent() category: ICategory, @Args() args: PaginationArgs) {
    const { id } = category
    const repository = this.connection.getRepository(Wiki)

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
}

export default CategoryResolver
