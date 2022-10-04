/* eslint-disable import/no-duplicates */
import { UseGuards, UseInterceptors } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import {
  Args,
  Mutation,
  Resolver,
  ArgsType,
  Field,
  Context,
} from '@nestjs/graphql'

import SentryInterceptor from '../../sentry/security.interceptor'
import AuthGuard from '../utils/admin.guard'
import LoggingInterceptor from '../utils/adminLogs.interceptor'
import { RevalidatePageService, Routes } from './revalidatePage.service'

@ArgsType()
class RouteArgs {
  @Field(() => String)
  route!: Routes

  @Field(() => String, { nullable: true })
  id?: string

  @Field(() => String, { nullable: true })
  slug?: string
}

@UseInterceptors(SentryInterceptor)
@UseInterceptors(LoggingInterceptor)
@Resolver(() => Boolean)
class RevalidatePageResolver {
  constructor(
    private revalidateService: RevalidatePageService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async revalidatePage(@Args() args: RouteArgs, @Context() ctx: any) {
    const cacheId = ctx.req.ip + args.route
    const c = await this.revalidateService.revalidate(args.route)
    if (c) {
      this.eventEmitter.emit('admin.action', `${cacheId}`)
    }
    return true
  }
}

export default RevalidatePageResolver
