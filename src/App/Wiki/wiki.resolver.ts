import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { UseGuards, UseInterceptors } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { DataSource } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import AuthGuard from '../utils/admin.guard'
import { SlugResult } from '../utils/validSlug'
import {
  RevalidatePageService,
  RevalidateEndpoints,
} from '../revalidatePage/revalidatePage.service'
import AdminLogsInterceptor from '../utils/adminLogs.interceptor'
import {
  ByIdArgs,
  CategoryArgs,
  LangArgs,
  PromoteWikiArgs,
  TitleArgs,
  WikiUrl,
} from './wiki.dto'
import WikiService from './wiki.service'
import { Count, DateArgs } from './wikiStats.dto'
import { IWiki } from '../../Database/Entities/types/IWiki'
import PageviewsPerDay from '../../Database/Entities/pageviewsPerPage.entity'
import { PageViewArgs, VistArgs } from '../pageViews/pageviews.dto'
import { updateDates } from '../utils/queryHelpers'

@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => Wiki)
class WikiResolver {
  constructor(
    private dataSource: DataSource,
    private revalidate: RevalidatePageService,
    private eventEmitter: EventEmitter2,
    private wikiService: WikiService,
  ) {}

  @Query(() => Wiki, { nullable: true })
  async wiki(@Args() args: ByIdArgs) {
    return this.wikiService.findWiki(args)
  }

  @Query(() => [Wiki])
  async wikis(@Args() args: LangArgs) {
    return this.wikiService.getWikis(args)
  }

  @Query(() => [Wiki])
  async promotedWikis(@Args() args: LangArgs) {
    return this.wikiService.getPromotedWikis(args)
  }

  @Query(() => [Wiki])
  async wikisByCategory(@Args() args: CategoryArgs) {
    return this.wikiService.getWikisByCategory(args)
  }

  @Query(() => [Wiki])
  async wikisByTitle(@Args() args: TitleArgs) {
    return this.wikiService.getWikisByTitle(args)
  }

  @Query(() => [Wiki])
  async wikisPerVisits(@Args() args: PageViewArgs) {
    return this.wikiService.getWikisPerVisits(args)
  }

  @Query(() => SlugResult)
  async validWikiSlug(@Args() args: ByIdArgs) {
    return this.wikiService.getValidWikiSlug(args)
  }

  @Query(() => [Wiki])
  @UseGuards(AuthGuard)
  async wikisHidden(@Args() args: LangArgs) {
    return this.wikiService.getWikisHidden(args)
  }

  @Query(() => [WikiUrl])
  async addressToWiki(
    @Args('address', { type: () => String }) address: string,
  ) {
    return this.wikiService.getAddressToWiki(address)
  }

  @Query(() => Count)
  async pageViewsCount(@Args() args: DateArgs) {
    return this.wikiService.getPageViewsCount(args)
  }

  @Query(() => Count)
  async categoryTotal(@Args() args: CategoryArgs) {
    return this.wikiService.getCategoryTotal(args)
  }

  @Mutation(() => Wiki, { nullable: true })
  @UseGuards(AuthGuard)
  async promoteWiki(@Args() args: PromoteWikiArgs, @Context() ctx: any) {
    const cacheId = ctx.req.ip + args.id
    const wiki = await this.wikiService.promoteWiki(args)
    if (wiki) {
      await this.revalidate.revalidatePage(RevalidateEndpoints.PROMOTE_WIKI)
      this.eventEmitter.emit('admin.action', `${cacheId}`)
    }
    return wiki
  }

  @Mutation(() => Wiki, { nullable: true })
  @UseGuards(AuthGuard)
  async hideWiki(@Args() args: ByIdArgs, @Context() ctx: any) {
    const cacheId = ctx.req.ip + args.id

    const wiki = await this.wikiService.hideWiki(args)

    if (wiki) {
      await this.revalidate.revalidatePage(
        RevalidateEndpoints.HIDE_WIKI,
        undefined,
        wiki.id,
        wiki.promoted,
      )
      this.eventEmitter.emit('admin.action', `${cacheId}`)
    }
    return wiki
  }

  @Mutation(() => Wiki, { nullable: true })
  @UseGuards(AuthGuard)
  async unhideWiki(@Args() args: ByIdArgs, @Context() ctx: any) {
    const cacheId = ctx.req.ip + args.id

    const wiki = await this.wikiService.unhideWiki(args)

    if (wiki) {
      await this.revalidate.revalidatePage(
        RevalidateEndpoints.HIDE_WIKI,
        undefined,
        wiki.id,
        wiki.promoted,
      )
      this.eventEmitter.emit('admin.action', `${cacheId}`)
    }
    return wiki
  }

  @ResolveField()
  async visits(@Parent() wiki: IWiki, @Args() args: VistArgs) {
    const { start, end } = await updateDates(args)
    const { visits } = await this.dataSource
      .getRepository(PageviewsPerDay)
      .createQueryBuilder('p')
      .select('Sum(visits)', 'visits')
      .where('day >= :start AND day <= :end', { start, end })
      .andWhere('p."wikiId" = :id', { id: wiki.id })
      .groupBy('p."wikiId"')
      .getRawOne()
    return visits
  }

  @ResolveField(() => [Wiki], { nullable: true })
  async founderWikis(@Parent() wiki: IWiki) {
    return this.wikiService.getFounderWikis(
      wiki.linkedWikis.founders as string[],
    )
  }
}

export default WikiResolver
