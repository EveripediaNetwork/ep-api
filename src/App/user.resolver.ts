import { Args, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import User from '../Database/Entities/user.entity'
import PaginationArgs from './pagination.args'

@Resolver(() => User)
class UserResolver {
  constructor(private connection: Connection) {}

  @Query(() => [User])
  async users(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(User)
    return repository.find({
      take: args.limit,
      skip: args.offset,
    })
  }
}

export default UserResolver
