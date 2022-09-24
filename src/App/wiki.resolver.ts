/* eslint-disable max-classes-per-file */
import {
  Args,
  ArgsType,
  Field,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Connection, MoreThan } from 'typeorm'
import { MinLength } from 'class-validator'
import { UseGuards, UseInterceptors } from '@nestjs/common'
import Wiki from '../Database/Entities/wiki.entity'
import PaginationArgs from './pagination.args'
import { IWiki } from '../Database/Entities/types/IWiki'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import { Author } from '../Database/Entities/types/IUser'
import AuthGuard from './utils/admin.guard'
import { SlugResult, ValidSlug } from './utils/validSlug'
import { OrderBy, orderWikis, Direction } from './utils/queryHelpers'
import {
  RevalidatePageService,
  RevalidateEndpoints,
} from './revalidatePage/revalidatePage.service'
import PageViews from '../Database/Entities/pageViews.entity'

@ArgsType()
class LangArgs extends PaginationArgs {
  @Field(() => String)
  lang = 'en'

  @Field(() => String)
  order = 'DESC'

  @Field(() => String)
  direction = 'updated'
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
class ByIdArgs {
  @Field(() => String)
  id!: string

  @Field(() => String)
  lang = 'en'
}

@ArgsType()
class PromoteWikiArgs extends ByIdArgs {
  @Field(() => Int)
  level = 0
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => Wiki)
class WikiResolver {
  constructor(
    private connection: Connection,
    private validSlug: ValidSlug,
    private revalidate: RevalidatePageService,
  ) {}

  @Query(() => Wiki)
  async wiki(@Args() args: ByIdArgs) {
    const repository = this.connection.getRepository(Wiki)
    return repository.findOneOrFail({
      where: {
        language: args.lang,
        id: args.id,
      },
    })
  }

  @Query(() => [Wiki])
  async wikis(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: {
        language: args.lang,
        hidden: false,
      },
      take: args.limit,
      skip: args.offset,
      order: orderWikis(args.order as OrderBy, args.direction as Direction),
    })
  }

  @Query(() => [Wiki])
  async promotedWikis(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: {
        language: args.lang,
        promoted: MoreThan(0),
        hidden: false,
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
      .where('wiki.language = :lang AND hidden = :status', {
        lang: args.lang,
        status: false,
      })
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
      .where(
        'wiki.language = :lang AND LOWER(wiki.title) LIKE :title AND hidden = :status',
        {
          lang: args.lang,
          status: false,
          title: `%${args.title.toLowerCase()}%`,
        },
      )
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  @Query(() => SlugResult)
  async validWikiSlug(@Args() args: ByIdArgs) {
    const repository = this.connection.getRepository(Wiki)
    const slugs = await repository
      .createQueryBuilder('wiki')
      .where('LOWER(wiki.id) LIKE :id AND hidden =  :status', {
        lang: args.lang,
        status: true,
        id: `%${args.id.toLowerCase()}%`,
      })
      .orderBy('wiki.created', 'DESC')
      .getMany()

    return this.validSlug.validateSlug(slugs[0]?.id)
  }

  @Query(() => [Wiki])
  //   @UseGuards(AuthGuard)
  async wikisHidden(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: {
        language: args.lang,
        hidden: true,
      },
      take: args.limit,
      skip: args.offset,
      order: {
        updated: 'DESC',
      },
    })
  }

  @Mutation(() => Wiki)
  @UseGuards(AuthGuard)
  async promoteWiki(@Args() args: PromoteWikiArgs) {
    const repository = this.connection.getRepository(Wiki)
    const wiki = await repository.findOneOrFail(args.id)
    await repository
      .createQueryBuilder()
      .update(Wiki)
      .set({ promoted: args.level })
      .where('id = :id', { id: args.id })
      .execute()

    await this.revalidate.revalidatePage(RevalidateEndpoints.PROMOTE_WIKI)
    return wiki
  }

  @Query(() => [PageViews])
  //   @UseGuards(AuthGuard)
  async wikiPromoteRandom() {
    const viewsRepository = this.connection.getRepository(PageViews)
    const wikiRepository = this.connection.getRepository(Wiki)
    const wikisRandom = await viewsRepository.query(`
        SELECT "wiki_id" FROM
            (
                SELECT "wiki_id" FROM "page_views"
                LEFT JOIN wiki w ON w.id = "wiki_id"
	 	        WHERE w.hidden = false
                ORDER BY views desc
                LIMIT 50
            ) as top50
        ORDER BY random()
        LIMIT 3
    `)
    const wikisPromoted = await wikiRepository.find({
      select: ['id', 'promoted'],
      where: {
        language: 'en',
        promoted: MoreThan(0),
        hidden: false,
      },
      take: 10,
      skip: 1,
      order: {
        promoted: 'DESC',
      },
    })
    if (wikisPromoted) {
      wikisPromoted.forEach(async e => {
        console.log(e.id)
        await wikiRepository
          .createQueryBuilder()
          .update(Wiki)
          .set({ promoted: 0 })
          .where('id = :id', { id: e.id })
          .execute()
      })
    }
    console.log('this is wikisRandom', wikisRandom.length)
    if (wikisRandom) {
      for (let i = 0; i < wikisRandom.length; i += 1) {
        console.log(wikisRandom[i].wiki_id, i)
        await wikiRepository
          .createQueryBuilder()
          .update(Wiki)
          .set({ promoted: i + 1 })
          .where('id = :id', { id: wikisRandom[i].wiki_id })
          .execute()
      }
      await this.revalidate.revalidatePage(RevalidateEndpoints.PROMOTE_WIKI)
    }
    console.log(wikisRandom)
    console.log(wikisPromoted)
    return wikisRandom
  }

  @Mutation(() => Wiki)
  @UseGuards(AuthGuard)
  async hideWiki(@Args() args: ByIdArgs) {
    const repository = this.connection.getRepository(Wiki)
    const wiki = await repository.findOneOrFail(args.id)
    await repository
      .createQueryBuilder()
      .update(Wiki)
      .set({ hidden: true })
      .where('id = :id', { id: args.id })
      .execute()

    await this.revalidate.revalidatePage(
      RevalidateEndpoints.HIDE_WIKI,
      undefined,
      wiki.id,
      wiki.promoted,
    )
    return wiki
  }

  @Mutation(() => Wiki)
  @UseGuards(AuthGuard)
  async unhideWiki(@Args() args: ByIdArgs) {
    const repository = this.connection.getRepository(Wiki)
    const wiki = await repository.findOneOrFail(args.id)
    await repository
      .createQueryBuilder()
      .update(Wiki)
      .set({ hidden: false })
      .where('id = :id', { id: args.id })
      .execute()

    await this.revalidate.revalidatePage(
      RevalidateEndpoints.HIDE_WIKI,
      undefined,
      wiki.id,
      wiki.promoted,
    )
    return wiki
  }

  @ResolveField(() => Author)
  async author(@Parent() wiki: IWiki) {
    const { id } = wiki
    const repository = this.connection.getRepository(Activity)
    const res = await repository.query(`SELECT "userId", u.* 
        FROM activity
        LEFT JOIN "user_profile" u ON u."id" = "userId"
        WHERE "wikiId" = '${id}' AND "type" = '0'`)
    return { id: res[0]?.userId, profile: { ...res[0] } || null }
  }
}

export default WikiResolver
