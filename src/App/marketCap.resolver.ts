import { UseInterceptors } from '@nestjs/common'
import { Args, ArgsType, Field, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import SentryInterceptor from '../sentry/security.interceptor'
import PaginationArgs from './pagination.args'

@ArgsType()
class MarketCapInputs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  nft?: string

  @Field(() => String, { nullable: true })
  token?: string
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => [])
class MarketCapResolver {
  constructor(private connection: Connection) {}

  // TODO: Implement return type wiki + mcap
  @Query(() => Boolean)
  async rankList(@Args() args: MarketCapInputs) {
    // const repository = this.connection.getRepository(Wiki)

    console.log(args)
    return true
  }
}

export default MarketCapResolver
