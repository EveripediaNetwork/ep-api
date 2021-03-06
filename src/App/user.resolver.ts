import {
  Args,
  Directive,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import { UseInterceptors } from '@nestjs/common'
import User from '../Database/Entities/user.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { IUser } from '../Database/Entities/types/IUser'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import UserProfile from '../Database/Entities/user_profile.entity'

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
      where: { user: id, hidden: false },
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
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`activity.userId = '${id}' AND w."hidden" = false`)
      .andWhere("activity.type = '0'")
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
        INNER JOIN "wiki" w
        ON w."id" = d."wikiId"
        WHERE w."hidden" = false
        LIMIT ${args.limit}
        OFFSET ${args.offset}
    `)
  }

  @ResolveField(() => UserProfile)
  @Directive('@isUser')
  async profile(@Parent() user: IUser) {
    const { id } = user
    const repository = this.connection.getRepository(UserProfile)
    return repository.findOne({
      where: `LOWER(id) = '${id.toLowerCase()}'`,
    })
  }
}

export default UserResolver
