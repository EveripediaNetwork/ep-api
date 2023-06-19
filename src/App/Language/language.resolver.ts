import { Args, Query, Resolver } from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import Language from '../../Database/Entities/language.entity'
import PaginationArgs from '../pagination.args'

@Resolver(() => Language)
class LanguageResolver {
  constructor(private dataSource: DataSource) {}

  @Query(() => [Language])
  async languages(@Args() args: PaginationArgs) {
    const repository = this.dataSource.getRepository(Language)
    return repository.find({
      take: args.limit,
      skip: args.offset,
    })
  }
}

export default LanguageResolver
