import { UseInterceptors } from '@nestjs/common'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Language from '../Database/Entities/language.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import PaginationArgs from './pagination.args'

@UseInterceptors(SentryInterceptor)
@Resolver(() => Language)
class LanguageResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Language])
  async languages(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(Language)
    return repository.find({
      take: args.limit,
      skip: args.offset,
    })
  }
}

export default LanguageResolver
