import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import User from '../Database/Entities/user.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { IUser } from '../Database/Entities/types/IUser'

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

  @Query(() => User)
  async userById(@Args('id', { type: () => String }) id: number) {
    const repository = this.connection.getRepository(User)
    return repository.findOneOrFail(id)
  }

  @ResolveField()
  async wikis(@Parent() user: IUser, @Args() args: PaginationArgs) {
    const { id } = user
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: { user: id },
      take: args.limit,
      skip: args.offset,
      order: {
        updated: 'DESC',
      },
    })
  }
}

export default UserResolver
