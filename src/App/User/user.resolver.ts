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
import {
  CACHE_MANAGER,
  Inject,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Cache } from 'cache-manager'
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
import SelectedFields from '../utils/getFields'
import { ArgsById } from '../general.args'

@UseInterceptors(AdminLogsInterceptor)
@Resolver(() => User)
class UserResolver {
  constructor(
    private dataSource: DataSource,
    private userService: UserService,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
  async userById(@Args() args: ArgsById, @SelectedFields() fields: string[]) {
    return this.userService.getUser(args.id, fields)
  }

  @Query(() => Boolean)
  @UseGuards(AuthGuard)
  async isAdmin() {
    return true
  }

  @Mutation(() => User, { nullable: true })
  @UseGuards(AuthGuard)
  async toggleUserStateById(
    @Args() args: UserStateArgs,
    @Context() ctx: any,
    @SelectedFields() fields: string[],
  ) {
    const cacheId = ctx.req.ip + args.id

    const user = await this.userService.getUser(args.id, fields)

    await (
      await this.userService.userRepository()
    )
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
      user?.id as string,
      args.limit,
      args.offset,
    )
  }

  @ResolveField()
  async wikisEdited(@Parent() user: IUser, @Args() args: PaginationArgs) {
    return this.userService.userWikis(
      'wikis edited',
      user?.id as string,
      args.limit,
      args.offset,
    )
  }

  @ResolveField(() => UserProfile)
  async profile(@Parent() user: IUser, @SelectedFields() fields: string[]) {
    const { id } = user
    const key = id.toLowerCase()
    const cached: UserProfile | undefined = await this.cacheManager.get(
      key as unknown as string,
    )

    if (!cached) {
      const a = await this.userService.getUserProfile(fields, { id })
      await this.cacheManager.set(key as unknown as string, a, { ttl: 180 })
      return a
    }
    return cached
  }
}

export default UserResolver
