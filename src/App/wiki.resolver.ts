import { Args, ArgsType, Field, Int, Query, Resolver } from '@nestjs/graphql'
import { Connection, MoreThan } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import PaginationArgs from './pagination.args'

@ArgsType()
class LangArgs extends PaginationArgs {
  @Field(() => String)
  lang = 'en'
}

@ArgsType()
class TitleArgs extends LangArgs {
  @Field(() => String)
  title!: string
}

@ArgsType()
class CategoryArgs extends LangArgs {
  @Field(() => String)
  category!: string
}

@ArgsType()
class ByIdAndBlockArgs {
  @Field(() => String)
  id!: string

  @Field(() => String)
  lang = 'en'

  @Field(() => Int)
  block = -1
}

@Resolver(() => Wiki)
class WikiResolver {
  constructor(private connection: Connection) {}

  @Query(() => Wiki)
  async wiki(@Args() args: ByIdAndBlockArgs) {
    const repository = this.connection.getRepository(Wiki)
    const condition =
      args.block === -1
        ? {
            language: args.lang,
            id: args.id,
          }
        : {
            language: args.lang,
            id: args.id,
            block: args.block,
          }
    return repository.findOneOrFail({ where: condition })
  }

  @Query(() => Wiki)
  async wikiByIdAndBlock(@Args('id', { type: () => String }) id: number) {
    const repository = this.connection.getRepository(Wiki)
    return repository.findOneOrFail(id)
  }

  @Query(() => [Wiki])
  async wikis(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: {
        language: args.lang,
      },
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => [Wiki])
  async promotedWikis(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: {
        language: args.lang,
        promoted: MoreThan(0),
      },
      take: args.limit,
      skip: args.offset,
      order: {
        promoted: 'DESC',
      },
    })
  }

  @Query(() => [Wiki])
  async wikisByCategory(@Args() args: CategoryArgs) {
    const repository = this.connection.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: args.category,
      })
      .where('wiki.language = :lang', { lang: args.lang })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  @Query(() => [Wiki])
  async wikisByTitle(@Args() args: TitleArgs) {
    const repository = this.connection.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .where('wiki.language = :lang AND wiki.title LIKE :title', {
        lang: args.lang,
        title: `%${args.title}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }
}

export default WikiResolver
