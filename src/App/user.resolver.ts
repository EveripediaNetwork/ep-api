import {
  Args,
  ArgsType,
  Context,
  Field,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import { UseGuards, UseInterceptors } from '@nestjs/common'
import { MinLength, Validate } from 'class-validator'
import { EventEmitter2 } from '@nestjs/event-emitter'
import User from '../Database/Entities/user.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { IUser } from '../Database/Entities/types/IUser'
import UserProfile from '../Database/Entities/userProfile.entity'
import AuthGuard from './utils/admin.guard'
import IsActiveGuard from './utils/isActive.guard'
import { queryWikisCreated, queryWikisEdited } from './utils/queryHelpers'
import AdminLogsInterceptor from './utils/adminLogs.interceptor'
import ValidStringParams from './utils/customValidator'
import Activity from '../Database/Entities/activity.entity'
import UserService from './user.service'

@ArgsType()
class UserStateArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string

  @Field(() => Boolean)
  active = true
}

@ArgsType()
class UsersByIdArgs extends PaginationArgs {
  @Field(() => String)
  @MinLength(3)
  @Validate(ValidStringParams)
  id!: string
}

@ArgsType()
class UsersByEditArgs extends PaginationArgs {
  @Field(() => Boolean, { nullable: true })
  edits!: boolean
}

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
      return (await this.userService.userRepository())
        .createQueryBuilder('user')
        .innerJoin('activity', 'a', 'a."userId" = "user"."id"')
        .innerJoin('wiki', 'w', 'w."id" = a."wikiId"')
        .where('w."hidden" = false')
        .groupBy('"user"."id"')
        .limit(args.limit)
        .offset(args.offset)
        .getMany()
    }
    return (await this.userService.userRepository()).find({
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => [User])
  async usersHidden(@Args() args: PaginationArgs) {
    return (await this.userService.userRepository()).find({
      where: {
        active: false,
      },
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => [User])
  async usersById(@Args() args: UsersByIdArgs) {
    return (await this.userService.userRepository())
      .createQueryBuilder()
      .where('LOWER("User".id) LIKE :id', {
        id: `%${args.id.toLowerCase()}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .getMany()
  }

  @Query(() => User, { nullable: true })
  @UseGuards(IsActiveGuard)
  async userById(@Args('id', { type: () => String }) id: string) {
    return (await this.userService.userRepository()).findOne({
      where: { id: `LOWER("User".id) = '${id.toLowerCase()}'` },
    })
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

    const user = await (
      await this.userService.userRepository()
    ).findOne({
      where: { id: `LOWER("User".id) = '${args.id.toLowerCase()}'` },
    })
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
    const repo = this.dataSource.getRepository(Activity)
    return queryWikisCreated(user, args.limit, args.offset, repo)
  }

  @ResolveField()
  async wikisEdited(@Parent() user: IUser, @Args() args: PaginationArgs) {
    const repo = this.dataSource.getRepository(Activity)
    return queryWikisEdited(user, args.limit, args.offset, repo)
  }

  @ResolveField(() => UserProfile)
  async profile(@Parent() user: IUser) {
    const { id } = user
    return (await this.userService.profileRepository()).findOne({
      where: { id: `LOWER(id) = '${id.toLowerCase()}'` },
    })
  }
}

export default UserResolver
