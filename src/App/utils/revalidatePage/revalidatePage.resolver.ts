import { UseGuards, UseInterceptors } from '@nestjs/common'
import { Args, Mutation, Resolver, ArgsType, Field } from '@nestjs/graphql'

import SentryInterceptor from '../../../sentry/security.interceptor'
import AuthGuard from '../admin.guard'
import { RevalidatePageService, Routes } from './revalidatePage.service'

@ArgsType()
class RouteArgs {
  @Field(() => String)
  route!: Routes

  @Field(() => String)
  id?: string

  @Field(() => String)
  slug?: string
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => Boolean)
class RevalidatePageResolver {
  constructor(private revalidateService: RevalidatePageService) {}

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async revalidatePage(@Args() args: RouteArgs) {
    await this.revalidateService.revalidate(args.route, args.id, args.slug)
    return true
  }
}

export default RevalidatePageResolver
