import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import PageViewsService from './pageViews.service'
import IpAddress from './utils/getIp'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Number)
class PageViewsResolver {
  constructor(
    private connection: Connection,
    private pageViewsService: PageViewsService,
  ) {}

  @Mutation(() => Number)
  async wikiViewCount(
    @Args('id', { type: () => String }) id: string,
    @Context() ctx: any,
    @IpAddress() ipAddress: any,
  ) {
    console.log('request ip', ipAddress)
    console.log('ip from context', ctx.req.ip)
    console.log('localAddress from context', ctx.req.socket.localAddress)
    console.log('remoteAddress from context', ctx.req.socket.remoteAddress)
    const repository = this.connection.getRepository(Wiki)

    const wiki = await repository.findOneOrFail({
      id,
    })
    return this.pageViewsService.updateCount(wiki.id)
  }
}

export default PageViewsResolver
