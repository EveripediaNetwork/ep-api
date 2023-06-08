import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { UseGuards, UseInterceptors } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
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
  PageViewArgs,
  PromoteWikiArgs,
  TitleArgs,
  WikiUrl,
} from './wiki.dto'
import WikiService from './wiki.service'
import { Count, DateArgs } from './wikiStats.dto'

@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => Wiki)
class WikiResolver {
  constructor(
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
    return this.wikiService.getAddressTowiki(address)
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
}

export default WikiResolver
