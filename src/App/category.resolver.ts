import { Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Category from '../Database/Entities/category.entity'

@Resolver(() => Category)
class CategoryResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Category])
  async categories() {
    const repository = this.connection.getRepository(Category)
    return repository.find()
  }
}

export default CategoryResolver
