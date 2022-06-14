import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import User from '../Database/Entities/user.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { IUser } from '../Database/Entities/types/IUser'
import Activity from '../Database/Entities/activity.entity'

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

  @ResolveField()
  async wikisCreated(@Parent() user: IUser, @Args() args: PaginationArgs) {
    const { id } = user
    const repository = this.connection.getRepository(Activity)
    return repository
      .createQueryBuilder('activity')
      .where(`activity.type = '0' AND activity.userId = :id`, { id })
      .groupBy('activity.wikiId, activity.id')
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  @ResolveField()
  async wikisEdited(@Parent() user: IUser, @Args() args: PaginationArgs) {
    const { id } = user
    const repository = this.connection.getRepository(Activity)
    return repository
      .createQueryBuilder('activity')
      .where(`activity.type = '1' AND activity.userId = :id`, { id })
      .groupBy('activity.wikiId, activity.id')
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }
}

export default UserResolver
