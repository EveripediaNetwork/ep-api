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
import gql from 'graphql-tag'
import Wiki from '../../Database/Entities/wiki.entity'
import AuthGuard from '../utils/admin.guard'
import { SlugResult } from '../utils/validSlug'
import { RevalidatePageService } from '../revalidatePage/revalidatePage.service'
import AdminLogsInterceptor from '../utils/adminLogs.interceptor'
import {
  ByIdArgs,
  CategoryArgs,
  EventArgs,
  eventTag,
  ExplorerArgs,
  hasField,
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
import Explorer, {
  ExplorerCount,
} from '../../Database/Entities/explorer.entity'
import Events from '../../Database/Entities/Event.entity'
import EventsService from './events.service'

@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => Wiki)
class WikiResolver {
  constructor(
    private dataSource: DataSource,
    private wikiService: WikiService,
    private eventEmitter: EventEmitter2,
    private revalidate: RevalidatePageService,
    private readonly eventsService: EventsService,
  ) {}

  @Query(() => Wiki, { nullable: true })
  async wiki(@Args() args: ByIdArgs) {
    return this.wikiService.findWiki(args)
  }

  @Query(() => [Wiki])
  async wikis(
    @Args() args: LangArgs,
    @Args('featuredEvents', { type: () => Boolean, nullable: true })
    featuredEvents: boolean,
  ) {
    return this.wikiService.getWikis(args, featuredEvents)
  }

  @Query(() => [Wiki])
  async promotedWikis(
    @Args() args: LangArgs,
    @Args('featuredEvents', { type: () => Boolean, defaultValue: false })
    featuredEvents: boolean,
  ) {
    return this.wikiService.getPromotedWikis(args, featuredEvents)
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
  async wikisHidden(
    @Args() args: LangArgs,
    @Args('featuredEvents', { type: () => Boolean, defaultValue: false })
    featuredEvents: boolean,
  ) {
    return this.wikiService.getWikisHidden(args, featuredEvents)
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

  @Query(() => [Explorer])
  async searchExplorers(@Args() args: ByIdArgs) {
    return this.wikiService.searchExplorers(args.id)
  }

  @Query(() => [Explorer])
  async explorers(@Args() args: ExplorerArgs) {
    return this.wikiService.getExplorers(args)
  }

  @Query(() => ExplorerCount)
  async explorerCount(@Args() args: ExplorerArgs) {
    return this.wikiService.countExplorers(args)
  }

  @Mutation(() => Explorer, { nullable: true })
  @UseGuards(AuthGuard)
  async addExplorer(@Args() args: Explorer) {
    return this.wikiService.addExplorer(args)
  }

  @Mutation(() => Boolean, { nullable: true })
  @UseGuards(AuthGuard)
  async updateExplorer(@Args() args: Explorer) {
    return this.wikiService.updateExplorer(args)
  }

  @Mutation(() => Wiki, { nullable: true })
  @UseGuards(AuthGuard)
  async promoteWiki(@Args() args: PromoteWikiArgs, @Context() ctx: any) {
    const cacheId = ctx.req.ip + args.id
    const wiki = await this.wikiService.promoteWiki(args)
    if (wiki) {
      await this.revalidate.revalidatePage(wiki.id)
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
      await this.revalidate.revalidatePage(wiki.id)
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
      await this.revalidate.revalidatePage(wiki.id)
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
    if (!wiki.linkedWikis) {
      return []
    }
    return this.wikiService.getFullLinkedWikis(
      wiki.linkedWikis.founders as unknown as string[],
    )
  }

  @ResolveField(() => [Wiki], { nullable: true })
  async speakerWikis(@Parent() wiki: IWiki) {
    if (!wiki.linkedWikis) {
      return []
    }
    return this.wikiService.getFullLinkedWikis(
      wiki.linkedWikis.speakers as string[],
    )
  }

  @ResolveField(() => [Wiki], { nullable: true })
  async blockchainWikis(@Parent() wiki: IWiki) {
    if (!wiki.linkedWikis) {
      return []
    }
    return this.wikiService.getFullLinkedWikis(
      wiki.linkedWikis.blockchains as string[],
    )
  }

  @Query(() => [Wiki], { nullable: true })
  async eventWikis(@Args() args: EventArgs, @Context() context: any) {
    const { req } = context
    const { query } = req.body

    const events = await this.eventsService.events(
      [eventTag, ...(args.tagIds || [])],
      args,
    )

    const resolvedEvents = await this.eventsService.resolveWikiRelations(
      events,
      query,
    )

    return resolvedEvents
  }

  @Query(() => Count)
  async totalEventWikis(@Args() args: EventArgs) {
    const [amount] = await this.eventsService.events(['events'], args, true)
    return amount
  }

  @ResolveField(() => [Events], { nullable: true })
  async events(@Parent() wiki: IWiki, @Context() context: any) {
    const { req } = context
    const { query } = req.body

    const ast = gql`
      ${query}
    `
    const isEventWikis = hasField(ast, 'eventWikis')

    if (!isEventWikis) {
      return this.wikiService.events(wiki.id)
    }
    return wiki.events as unknown as Events[]
  }
}

export default WikiResolver
