import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import { UseInterceptors } from '@nestjs/common'
import User from '../Database/Entities/user.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { IUser } from '../Database/Entities/types/IUser'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'

@UseInterceptors(SentryInterceptor)
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
  async userById(@Args('id', { type: () => String }) id: string) {
    const repository = this.connection.getRepository(User)
    return repository.findOneOrFail({
      where: `LOWER(id) = '${id.toLowerCase()}'`,
    })
  }

  @ResolveField()
  async wikis(@Parent() user: IUser, @Args() args: PaginationArgs) {
    const { id } = user
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: { user: id, hidden: args.hidden },
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
      .where(`activity.userId = '${id}'`)
      .andWhere("activity.type = '0' AND activity.hidden = false")
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
    return repository.query(`
      SELECT d."wikiId", d."ipfs", d."type", d."content", d."userId", d."id", d."datetime" FROM
      (
          SELECT "wikiId", Max(datetime) as MaxDate  
          FROM activity
          WHERE type = '1' AND "activity"."userId" = '${id}'
          GROUP BY "activity"."wikiId"
      ) r
      INNER JOIN "activity" d
      ON d."wikiId"=r."wikiId" AND d.datetime=r.MaxDate
      LIMIT ${args.limit}
      OFFSET ${args.offset}
    `)
  }
}

export default UserResolver
