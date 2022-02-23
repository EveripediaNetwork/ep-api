import { Args, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'

@Resolver(() => Wiki)
class WikiResolver {
  constructor(private connection: Connection) {}

  @Query(() => Wiki)
  async wiki(@Args('id', { type: () => String }) id: number) {
    const repository = this.connection.getRepository(Wiki)
    return repository.findOneOrFail(id)
  }

  @Query(() => [Wiki])
  async wikis() {
    const repository = this.connection.getRepository(Wiki)
    return repository.find()
  }
}

export default WikiResolver
