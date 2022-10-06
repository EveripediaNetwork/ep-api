import {
  Args,
  ArgsType,
  Context,
  Directive,
  Field,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import { UseGuards, UseInterceptors } from '@nestjs/common'
import { MinLength } from 'class-validator'
import { EventEmitter2 } from '@nestjs/event-emitter'
import User from '../Database/Entities/user.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { IUser } from '../Database/Entities/types/IUser'
import SentryInterceptor from '../sentry/security.interceptor'
import UserProfile from '../Database/Entities/userProfile.entity'
import AuthGuard from './utils/admin.guard'
import IsActiveGuard from './utils/isActive.guard'
import { queryWikisCreated, queryWikisEdited } from './utils/queryHelpers'
import AdminLogsInterceptor from './utils/adminLogs.interceptor'

@ArgsType()
class UserStateArgs {
  @Field(() => String)
  id!: string

  @Field(() => Boolean)
  active = true
}

@ArgsType()
class UsersByIdArgs extends PaginationArgs {
  @Field(() => String)
  @MinLength(3)
  id!: string
}

@UseInterceptors(SentryInterceptor)
@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => User)
class UserResolver {
  constructor(
    private connection: Connection,
    private eventEmitter: EventEmitter2,
  ) {}

  @Query(() => [User])
  async users(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(User)
    return repository.find({
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => [User])
  async usersHidden(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(User)
    return repository.find({
      where: {
        active: false,
      },
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => [User])
  async usersById(@Args() args: UsersByIdArgs) {
    const repository = this.connection.getRepository(User)
    return repository
      .createQueryBuilder()
      .where('LOWER(id) LIKE :id', {
        id: `%${args.id.toLowerCase()}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .getMany()
  }

  @Query(() => User)
  @UseGuards(IsActiveGuard)
  async userById(@Args('id', { type: () => String }) id: string) {
    const repository = this.connection.getRepository(User)
    return repository.findOneOrFail({
      where: `LOWER(id) = '${id.toLowerCase()}'`,
    })
  }

  @Query(() => Boolean)
  @UseGuards(AuthGuard)
  async isAdmin() {
    return true
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard)
  async toggleUserStateById(@Args() args: UserStateArgs, @Context() ctx: any) {
    const cacheId = ctx.req.ip + args.id
    
    const repository = this.connection.getRepository(User)
    const user = await repository.findOneOrFail({
      where: `LOWER(id) = '${args.id.toLowerCase()}'`,
    })
    await repository
      .createQueryBuilder()
      .update(User)
      .set({ active: args.active })
      .where({ id: user.id })
      .execute()

    this.eventEmitter.emit('admin.action', `${cacheId}`)

    return user
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
    return queryWikisCreated(user, args.limit, args.offset)
  }

  @ResolveField()
  async wikisEdited(@Parent() user: IUser, @Args() args: PaginationArgs) {
    return queryWikisEdited(user, args.limit, args.offset)
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
