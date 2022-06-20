import {
  Args,
  ArgsType,
  Field,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Connection, MoreThan } from 'typeorm'
import { MinLength } from 'class-validator'
import { UseInterceptors } from '@nestjs/common'
import Wiki from '../Database/Entities/wiki.entity'
import PaginationArgs from './pagination.args'
import { IWiki } from '../Database/Entities/types/IWiki'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'

@ArgsType()
class LangArgs extends PaginationArgs {
  @Field(() => String)
  lang = 'en'
}

@ArgsType()
class TitleArgs extends LangArgs {
  @Field(() => String)
  @MinLength(3)
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

@UseInterceptors(SentryInterceptor)
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
      order: {
        updated: 'DESC',
      },
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
      .where('wiki.language = :lang AND LOWER(wiki.title) LIKE :title', {
        lang: args.lang,
        title: `%${args.title.toLowerCase()}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  @ResolveField()
  async author(@Parent() wiki: IWiki) {
    const { id } = wiki
    const repository = this.connection.getRepository(Activity)
    const res = await repository.query(`
      SELECT "userId"
      FROM "activity"
      WHERE "wikiId" = '${id}' AND "type" = '0'
    `)
    return { id: res[0]?.userId || null }
  }
}

export default WikiResolver
