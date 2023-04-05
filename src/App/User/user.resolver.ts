import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import { UseGuards, UseInterceptors } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import User from '../../Database/Entities/user.entity'
import PaginationArgs from '../pagination.args'
import Wiki from '../../Database/Entities/wiki.entity'
import { IUser } from '../../Database/Entities/types/IUser'
import UserProfile from '../../Database/Entities/userProfile.entity'
import AuthGuard from '../utils/admin.guard'
import IsActiveGuard from '../utils/isActive.guard'
import AdminLogsInterceptor from '../utils/adminLogs.interceptor'
import UserService from './user.service'
import { UsersByEditArgs, UsersByIdArgs, UserStateArgs } from './user.dto'

@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => User)
class UserResolver {
  constructor(
    private dataSource: DataSource,
    private userService: UserService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Query(() => [User])
  async users(@Args() args: UsersByEditArgs) {
    if (args.edits) {
      return this.userService.getUsersByEdits(args)
    }
    return (await this.userService.userRepository()).find({
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => [User])
  async usersHidden(@Args() args: PaginationArgs) {
    return this.userService.getUsersHidden(args)
  }

  @Query(() => [User])
  async usersById(@Args() args: UsersByIdArgs) {
    return this.userService.getUsesrById(args)
  }

  @Query(() => User, { nullable: true })
  @UseGuards(IsActiveGuard)
  async userById(@Args('id', { type: () => String }) id: string) {
    return this.userService.getUser(id)
  }

  @Query(() => Boolean)
  @UseGuards(AuthGuard)
  async isAdmin() {
    return true
  }

  @Mutation(() => User, { nullable: true })
  @UseGuards(AuthGuard)
  async toggleUserStateById(@Args() args: UserStateArgs, @Context() ctx: any) {
    const cacheId = ctx.req.ip + args.id

    const user = await this.userService.getUser(args.id)

    await (await this.userService.userRepository())
      .createQueryBuilder()
      .update(User)
      .set({ active: args.active })
      .where({ id: user?.id })
      .execute()

    if (user) this.eventEmitter.emit('admin.action', `${cacheId}`)

    return user
  }

  @ResolveField()
  async wikis(@Parent() user: IUser, @Args() args: PaginationArgs) {
    const wikiRepo = this.dataSource.getRepository(Wiki)
    return wikiRepo.find({
      where: { user, hidden: false },
      take: args.limit,
      skip: args.offset,
      order: {
        updated: 'DESC',
      },
    })
  }

  @ResolveField()
  async wikisCreated(@Parent() user: IUser, @Args() args: PaginationArgs) {
    return this.userService.userWikis(
      'wikis created',
      user,
      args.limit,
      args.offset,
    )
  }

  @ResolveField()
  async wikisEdited(@Parent() user: IUser, @Args() args: PaginationArgs) {
    return this.userService.userWikis(
      'wikis edited',
      user,
      args.limit,
      args.offset,
    )
  }

  @ResolveField(() => UserProfile)
  async profile(@Parent() user: IUser) {
    const { id } = user
    return this.userService.getUserProfile(id)
  }
}

export default UserResolver
