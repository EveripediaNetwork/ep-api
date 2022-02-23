import { Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Language from '../Database/Entities/language.entity'

@Resolver(() => Language)
class LanguageResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Language])
  async languages() {
    const repository = this.connection.getRepository(Language)
    return repository.find()
  }
}

export default LanguageResolver
